
/* ================ VIRTUAL MACHINE CONSTANTS ================= */

let RTS: any[] = []; // Stack for the runtime system
let OS: any[] = [];  // Operand stack, must be initialized as an array
let E: any = null;   // Environment, should be initialized to avoid "undefined" access
let pc: number = 0;  // Program counter


/* ================ MICROCODE AND PRIMITIVE FUNCTIONS ================= */
const binop_microcode: Record<string, Function> = {
    "+": (x: number, y: number) => x + y,
    "*": (x: number, y: number) => x * y,
    "-": (x: number, y: number) => x - y,
    "/": (x: number, y: number) => x / y,
    "%": (x: number, y: number) => x % y,
    "<": (x: number, y: number) => x < y,
    "<=": (x: number, y: number) => x <= y,
    ">=": (x: number, y: number) => x >= y,
    ">": (x: number, y: number) => x > y,
    "===": (x: any, y: any) => x === y,
    "!==": (x: any, y: any) => x !== y,
    "&&": (x: any, y: any) => x && y,
    "||": (x: any, y: any) => x || y,
};

const unop_microcode: Record<string, Function> = {
    "-unary": (x: number) => -x,
    "!": (x: boolean) => !x,
};

// Assuming heap_get_Environment_value and other heap_* functions are defined elsewhere
// with the appropriate types, otherwise you'd need to define them as well.

function lookup(pos: any, environment: any): any {
    return heap_get_Environment_value(environment, pos);
}

function assign(pos: any, value: any, environment: any): void {
    heap_set_Environment_value(environment, pos, value);
}

function extendEnvironment(values: any[], env: any): any {
    const arity: number = values.length;
    const newFrame: any = heap_allocate_Frame(arity);
    for (let i = 0; i < arity; i++){
        heap_set_child(newFrame, i, values[i]);
    }
    return heap_Environment_extend(newFrame, env);
}


/* ================ CHANNEL OPERATIONS ================= */

function read_channel(channel: any, receiver: any): void {
    console.log(`trying to read from channel ${channel}`);
    if (!heap_is_channel_read(channel)){
        heap_set_channel_read(channel);
    }
    if (heap_is_channel_written(channel)){
        const val: any = heap_read_channel(channel);
        OS.pop(); // Remove channel address from OS
        OS.push(val);
        // Assign to receiver the value
        assign(receiver, val, E);

        // Wake up dormant thread if not itself
        unset_dormant_routine(channel);
    } else {
        pc--;
        set_dormant_routine(channel, currentRoutine);
    }
}

function write_channel(channel: any): void {
    console.log(`trying to write to channel ${channel}`);
    if (!heap_is_channel_written(channel)){
        const val: any = OS.pop();
        heap_write_to_channel(channel, val);
    }
    if (!heap_is_channel_read(channel)){
        pc--;
        // console.warn("PC currently not updated in write to channel")
        // Set to dormant
        set_dormant_routine(channel, currentRoutine);
    } else {
        // Wake up dormant thread if not itself
        unset_dormant_routine(channel);
    }
}

function unset_dormant_routine(channel: any): void {
    const dormantRoutine = address_to_JS_value(heap_get_channel_dormant_routine(channel));
    if (!is_active_routine(dormantRoutine)) {
        // Not active: wake up (put first in queue)
        activeRoutines.unshift(dormantRoutine);
        console.log(`Woke up ${dormantRoutine}`);
    }
}

function set_dormant_routine(channel: any, routine: any): void {
    // Remove from active routines
    activeRoutines.splice(activeRoutines.indexOf(routine), 1);
    const routine_addr = JS_value_to_address(routine);
    heap_set_channel_dormant_routine(channel, routine_addr);
    console.log(`Putting channel ${routine} to sleep: sweet dreams`);
    console.log(`On channel with address ${channel}`);
}

function is_active_routine(routine: any): boolean {
    return activeRoutines.includes(routine);
}


/* ================ INSTRUCTION EXECUTION FUNCTION ================= */

function execute_instruction(instruction: any): void {
    if (instruction.tag === "LDC") {
        const addr = JS_value_to_address(instruction.val);
        OS.push(addr);
    }
    else if (instruction.tag === "LD") {
        OS.push(lookup(instruction.pos, E));
    }
    else if (instruction.tag === "BINOP") {
        const op2 = address_to_JS_value(OS.pop());
        const op1 = address_to_JS_value(OS.pop());
        const operand = instruction.sym;
        const res = binop_microcode[operand](op1, op2);
        const resultAddress = JS_value_to_address(res);
        OS.push(resultAddress);
    }
    else if (instruction.tag === "UNOP") {
        const op1 = address_to_JS_value(OS.pop());
        const operand = instruction.sym;
        const res = unop_microcode[operand](op1);
        OS.push(JS_value_to_address(res));
    }
    else if (instruction.tag === "POP") {
        OS.pop();
    }
    else if (instruction.tag === "ASSIGN") {
        // Assign last element on OS to symbol in env E
        assign(instruction.pos, OS.slice(-1)[0], E);
    }
    else if (instruction.tag === "JOF") {
        if (!OS.pop()) {
            pc = instruction.addr;  // Since we inc pc later, maybe -1?
        }
    }
    else if (instruction.tag === "GOTO") {
        pc = instruction.addr;
    }
    else if (instruction.tag === "ENTER_SCOPE") {
        // Extend environment with new frame that includes all locals 
        // assigned to unassigned
        RTS.push(heap_allocate_Blockframe(E));
        const new_frame = heap_allocate_Frame(instruction.num);
        E = heap_Environment_extend(new_frame, E);
        for (let i = 0; i < instruction.num; i++) {
            heap_set_child(new_frame, i, Unassigned);
        }
    }
    else if (instruction.tag === "EXIT_SCOPE") {
        // Reset the previous environment from RTS
        E = heap_get_Blockframe_environment(RTS.pop());
    }
    else if (instruction.tag === "LDF") {
        const arity = instruction.arity;
        const address = instruction.addr;
        const closure_address = heap_allocate_Closure(arity, address, E);
        OS.push(closure_address);
    }
    else if (instruction.tag === "CALL") {
        // On OS: all arguments above function itself
        // Load arguments backwards since pushed so
        const args: any[] = [];
        const frame_address = heap_allocate_Frame(instruction.arity);
        for (let i = instruction.arity - 1; i >= 0; i--) {
            args[i] = OS.pop();
            heap_set_child(frame_address, i, args[i]);
        }
        const funcToCall = OS.pop();
        const callFrame = heap_allocate_Callframe(E, pc);
        RTS.push(callFrame);
        E = heap_Environment_extend(frame_address, heap_get_Closure_environment(funcToCall));
        pc = heap_get_Closure_pc(funcToCall);
    }
    else if (instruction.tag === "GOCALL") {
        // Get args and func from old OS
        const args: any[] = [];
        for (let i = instruction.arity - 1; i >= 0; i--) {
            args[i] = OS.pop();
        }
        const funcToCall = OS.pop();

        // Clone current E, RTS, OS, PC and do call with the new ones
        const routine = createNewGoRoutineFromCurrent();
        switchToRoutine(currentRoutine, routine);

        // On OS: all arguments above function itself
        // Load arguments backwards since pushed so
        const frame_address = heap_allocate_Frame(instruction.arity);
        for (let i = instruction.arity - 1; i >= 0; i--) {
            // args[i] = OS.pop();
            heap_set_child(frame_address, i, args[i]);
        }
        // const funcToCall = OS.pop();
        const callFrame = heap_allocate_Gocallframe(E, pc); // Different from above
        RTS.push(callFrame);
        // E = extendEnvironment(args, heap_get_Closure_environment(funcToCall));
        E = heap_Environment_extend(frame_address, heap_get_Closure_environment(funcToCall));
        pc = heap_get_Closure_pc(funcToCall);
    }
    else if (instruction.tag === "RESET") {
        pc--;
        const topFrame = RTS.pop();
        if (is_Gocallframe(topFrame)) {
            killRoutine(currentRoutine);
        }
        if (is_Callframe(topFrame)) {
            pc = heap_get_Callframe_pc(topFrame);
            E = heap_get_Callframe_environment(topFrame);
        }
    }
    else if (instruction.tag === "CREATE_CHAN") {
        const channel_address = heap_allocate_Channel();
        OS.push(channel_address);
    }
    else if (instruction.tag === "USE_CHANNEL") {
        // Two cases:
        //  1. left side is channel
        //    What's on the stack is what to write to the channel
        //    Write to the channel
        //  2. left side is not channel
        //    Means that right side should be a channel
        //    and thus what's on the OS is channel's address
        //    Left side is variable to assign with channel value
        //    Read from the channel
        
        const address = lookup(instruction.left, E);
        if (is_Channel(address)) {
            write_channel(address);
        } else {
            const channel_address = peek(OS, 0); //!!!!!!!
            console.log(`Peeking at ${channel_address}`);
            read_channel(channel_address, instruction.left);
        }
    }
    else {
        console.log(instruction);
        throw new Error(`Undefined instruction: ${instruction.tag}`);
    }
}


/* ================ CONCURRENT ROUTINES MANAGEMENT ================= */

// Function to initialize an empty environment
function initializeEmptyEnvironment(){
    const newEnv: any[] = [];
    return newEnv;
}

// Global variables for managing goroutines
let environments: any[] = [];
let pcs: number[] = [];
let currentRoutine: number;
let activeRoutines: number[] = [];
let nRoutines: number = 0;
let newRTS: any[] = [];
let newOS: any[] = [];

function createNewGoRoutine(): number {
    const newEnv = initializeEmptyEnvironment();
    const newRTS: any[] = [];
    const newOS: any[] = [];
    const newPC = 0;
    environments[nRoutines] = newEnv;
    runtimeStacks[nRoutines] = newRTS;
    operandStacks[nRoutines] = newOS;
    pcs[nRoutines] = newPC;
    activeRoutines.push(nRoutines);
    return nRoutines++; // returns index of routine created
}

function createNewGoRoutineFromCurrent(): number {
    const newEnv = heap_Environment_copy(E);
    const newRTS = [...RTS];
    const newOS = [...OS];
    const newPC = pc;
    environments[nRoutines] = newEnv;
    runtimeStacks[nRoutines] = newRTS;
    operandStacks[nRoutines] = newOS;
    pcs[nRoutines] = newPC;
    activeRoutines.push(nRoutines);
    return nRoutines++; // returns index of routine created
}

function switchToRoutine(from: number, to: number): void {
    /* Switch from routine with index 'from' to 
       routine with index 'to'. 
       pc and E are written back to 
       old routine. */

    // Write back state for from-routine
    environments[from] = E;
    runtimeStacks[from] = RTS;  // Currently passed by ref so this not needed
    operandStacks[from] = OS;  // Currently passed by ref so this not needed
    pcs[from] = pc;

    // Get state for to-routine
    E = environments[to];
    RTS = runtimeStacks[to];
    OS = operandStacks[to];
    pc = pcs[to];
    currentRoutine = to;
    // console.log(`Switches to routine ${currentRoutine}`);
}


function killRoutine(routine: number): void {
    /* Kills a routine by removing it from 
       active routines. */
    const index = activeRoutines.indexOf(routine);
    activeRoutines.splice(index, 1);
}

/* ================ INITIALIZATION AND SYSTEM FUNCTIONS ================= */

function initBaseRoutine(): number {
    /* Create program's base routine,
       i.e. the one running from the beginning.
    */
    initSystem();
    nRoutines = 0;
    const baseRoutine = createNewGoRoutine();
    E = environments[baseRoutine];
    RTS = runtimeStacks[baseRoutine];
    OS = operandStacks[baseRoutine];
    pc = pcs[baseRoutine];
    return baseRoutine;
}

function rotateRoutine(): void {
    /* Update to next routine in queue. */
    // if (isActive(currentRoutine)) {
    //    activeRoutines.push(currentRoutine);
    // }
    const newRoutine = activeRoutines.shift();
    if (newRoutine !== undefined) {
        activeRoutines.push(newRoutine);
        switchToRoutine(currentRoutine, newRoutine);
    }
}

function isActive(routine: number): boolean {
    return activeRoutines.includes(routine);
}

function initSystem(): void {
    /* Initialize all data structures */
    environments = [];
    runtimeStacks = [];
    operandStacks = [];
    pcs = [];
    nRoutines = 0;
    currentRoutine = 0;
    activeRoutines = [];
    init_heap(1000000);
}

/* ================ TYPE DEFINITIONS & CLASSES ================= */
type Instruction =
    | { tag: string; }
    | { tag: string; addr: number; };


/* ================ UTILITY FUNCTIONS ================= */

class Pair<T, U> {
    constructor(public frst: T, public scnd: U) {}

    get head(): T {
        return this.frst;
    }

    get tail(): U {
        return this.scnd;
    }

    set head(val: T) {
        this.frst = val;
    }

    set tail(val: U) {
        this.scnd = val;
    }
}

function compare_lists<T>(l1: T[], l2: T[]): boolean {
    if (l1.length !== l2.length) {
        return false;
    }
    for (let i = 0; i < l1.length; i++) {
        if (l1[i] !== l2[i]) {
            return false;
        }
    }
    return true;
}

function contains_sublist<T>(big_list: T[][], small_list: T[]): boolean {
    for (let sub_list of big_list) {
        if (compare_lists(sub_list, small_list)) {
            return true;
        }
    }
    return false;
}

const channel_positions: any[] = [];

function isCompiledChannel(pos: any): boolean {
    return contains_sublist(channel_positions, pos);
}


/* ================ MAIN EXECUTION FLOW ================= */
function run(): void {
    // Create routine that main program is run as
    currentRoutine = initBaseRoutine();

    console.log(INSTRUCTIONS);
    while (!(INSTRUCTIONS[pc].tag === "DONE")) {
        // Fetch next instruction and execute
        const instruction = INSTRUCTIONS[pc++];
        console.log(`${currentRoutine} Executes: ${instruction.tag} `);
        execute_instruction(instruction);
        // console.log(OS);
        // console.log(activeRoutines);
        // console.log(instruction)
        // Switch routine
        rotateRoutine();
        console.log(activeRoutines);
    }
}

/* ================ TEST CASES ================= */
const test_addition = {
    "tag": "BINOP",
    "sym": "+",
    "operands": [
        {"tag": "LIT", "val": 1},  // First operand as a literal value 1
        {"tag": "LIT", "val": 2}   // Second operand as a literal value 2
    ]
};

/* === Test Execution Function === */
function executeTestCase(testCase: any) {
    const { sym, operands } = testCase;
    const result = binop_microcode[sym](operands[0].val, operands[1].val);
    console.log(`Test Case Result: ${result}`);
}

/* === Run Test Case === */
executeTestCase(test_addition);  // Expected Output: Test Case Result: 3