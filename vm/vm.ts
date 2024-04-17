/* ================ HELPERS ================= */
type Instruction =
    | { tag: string; }
    | { tag: string; addr: number; };

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

/* ================ COMPILER ================ */
let INSTRUCTIONS: any[] = [];
let wc: number = 0;

function compile_component(component: any, compile_environment: any[]): void {
    if (component.tag === "lit") {
        INSTRUCTIONS[wc++] = { tag: "LDC", val: component.val };
    } else if (component.tag === "binop") {
        compile_component(component.frst, compile_environment);
        compile_component(component.scnd, compile_environment);
        INSTRUCTIONS[wc++] = { tag: "BINOP", sym: component.sym };
    } else if (component.tag === "unop") {
        compile_component(component.frst, compile_environment);
        INSTRUCTIONS[wc++] = { tag: "UNOP", sym: component.sym };
    } else if (component.tag === "seq") {
        const sequence = component.stmts;
        if (sequence.length === 0) {
            INSTRUCTIONS[wc++] = { tag: "LDC", val: undefined };
        }
        let frst = true;
        for (let seq_part of sequence) {
            frst ? frst = false : INSTRUCTIONS[wc++] = { tag: "POP" };
            compile_component(seq_part, compile_environment);
        }
    } else if (component.tag === "nam") {
        INSTRUCTIONS[wc++] = {
            tag: "LD",
            sym: component.sym,
            pos: compile_time_environment_position(compile_environment, component.sym)
        };
    } else if (component.tag === "assmt") {
        compile_component(component.right, compile_environment);
        INSTRUCTIONS[wc++] = {
            tag: "ASSIGN",
            pos: compile_time_environment_position(compile_environment, component.left.sym)
        };
    } else if (component.tag === "cond"){
        compile_component(component.pred, compile_environment);
        const jump_on_false_instr: { tag: string, addr?: number } = { tag: "JOF" };
        INSTRUCTIONS[wc++] = jump_on_false_instr;
        const alternative_address = wc;
        compile_component(component.cons, compile_environment);
        const goto_instr: { tag: string, addr?: number } = { tag: "GOTO" };
        INSTRUCTIONS[wc++] = goto_instr;
        compile_component(component.alt, compile_environment);
        jump_on_false_instr.addr = alternative_address;
        goto_instr.addr = wc;
    } else if (component.tag === "app") { // Changed from 'args' to 'arguments' to match parser
        compile_component(component.fun, compile_environment);
        const args = component.arguments;
        for (let arg of args) {
            compile_component(arg, compile_environment);
        }
        INSTRUCTIONS[wc++] = { tag: "CALL", arity: args.length };
    } else if (component.tag === "blk") {
        const locals = scan(component.body);
        INSTRUCTIONS[wc++] = { tag: "ENTER_SCOPE", num: locals.length, syms: locals };
        compile_component(component.body, compile_time_environment_extend(locals, compile_environment));
        INSTRUCTIONS[wc++] = { tag: "EXIT_SCOPE" };
    } else if (component.tag === "const") {
        const pos = compile_time_environment_position(compile_environment, component.sym);
        if (is_null(component.expr)) {
            INSTRUCTIONS[wc++] = { tag: "LDC", val: undefined };
        } else {
            compile_component(component.expr, compile_environment);
        }
        INSTRUCTIONS[wc++] = {
            tag: "ASSIGN",
            pos: pos
        };
    } else if (component.tag === "var") {
        const pos = compile_time_environment_position(compile_environment, component.sym);
        if (is_null(component.expr)) {
            INSTRUCTIONS[wc++] = { tag: "LDC", val: undefined };
        } else {
            compile_component(component.expr, compile_environment);
        }
        INSTRUCTIONS[wc++] = {
            tag: "ASSIGN",
            pos: pos
        };
    } else if (component.tag === "ReturnStatement") { // Changed from 'ret' and 'component.argument' to match parser
        compile_component(component.argument, compile_environment);
        INSTRUCTIONS[wc++] = { tag: "RESET" };
    } else if (component.tag === "fun") {
        // Rewrite as a const declaration to a lambda function
        compile_component({
            tag: "const",
            sym: component.sym,
            expr: {
                tag: "lam",
                prms: component.prms,
                arity: component.prms.length,
                body: component.body
            }
        }, compile_environment);
    } else if (component.tag === "lam") {
        INSTRUCTIONS[wc++] = { tag: "LDF", arity: component.arity, addr: wc + 1 };
        const goto_instr: { tag: string, addr?: number } = { tag: "GOTO" };
        INSTRUCTIONS[wc++] = goto_instr;
        compile_component(component.body, compile_time_environment_extend(component.prms, compile_environment));
        INSTRUCTIONS[wc++] = { tag: "LDC", val: undefined };
        INSTRUCTIONS[wc++] = { tag: "RESET" };
        goto_instr.addr = wc;
    } else if (component.tag === "goroutine") {
        // Compile application call
        compile_component(component.function, compile_environment);
        // Change "CALL" to "GOCALL"
        INSTRUCTIONS[wc - 1] = { tag: "GOCALL", arity: INSTRUCTIONS[wc - 1].arity };
        INSTRUCTIONS[wc++] = { tag: "LDC", val: undefined };
    } else if (component.tag === "MakeChannel") {
        INSTRUCTIONS[wc++] = { tag: "CREATE_CHAN" };
    } else if (component.tag === "Arrow") {
        compile_component(component.right, compile_environment);
        INSTRUCTIONS[wc++] = {
            tag: "USE_CHANNEL",
            left: compile_time_environment_position(compile_environment, component.left.sym),

        };
    } else if (component.tag === undefined) {
        // Do nothing
    } else if (component.tag === "EmptyStatement") {
        throw new TypeError(`Empty statements are not allowed in this compiler`);
    } else {
        throw new TypeError(`Unknown construct: ${component.tag}`);
    }
}

/* ================ COMPILER ENVIRONMENT ================ */

function scan(block: any[]): string[] {
    const syms: string[] = [];
    for (let stmt of block) {
        if (stmt.tag === "var" || stmt.tag === "const") {
            syms.push(stmt.sym);
        }
    }
    return syms;
}

function compile_time_environment_position(compile_environment: any[], sym: string): number {
    for (let i = compile_environment.length - 1; i >= 0; i--) {
        const syms = compile_environment[i];
        if (syms.has(sym)) {
            return new Pair(i, syms.get(sym)).head;
        }
    }
    return -1; // Or any default value you prefer
}

function is_null(val: any): boolean {
    return val === null || val === undefined;
}

function compile_time_environment_extend(syms: string[], compile_environment: any[]): any[] {
    return [new Map(syms.map((sym, idx) => [sym, new Pair(compile_environment.length, idx)])), ...compile_environment];
}

/* ================ VIRTUAL MACHINE ================ */

let RTS: any;
let OS: any;
let E: any;
let pc: number = 0;

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
    // Logical binary operators
    "&&": (x: any, y: any) => x && y,
    "||": (x: any, y: any) => x || y,
};

const unop_microcode: Record<string, Function> = {
    "-unary": (x: number) => -x,
    "!": (x: boolean) => !x,
};

function execute(): any {
    while (true) {
        const instr = INSTRUCTIONS[pc];
        if (instr.tag === "DONE") {
            return E.frst;
        } else if (instr.tag === "LDC") {
            RTS.push(instr.val);
            pc++;
        } else if (instr.tag === "BINOP") {
            const x = RTS.pop();
            const y = RTS.pop();
            RTS.push(binop_microcode[instr.sym](x, y));
            pc++;
        } else if (instr.tag === "UNOP") {
            RTS.push(unop_microcode[instr.sym](RTS.pop()));
            pc++;
        } else if (instr.tag === "LD") {
            RTS.push(OS[E.head][instr.pos]);
            pc++;
        } else if (instr.tag === "ASSIGN") {
            OS[E.head][instr.pos] = RTS.pop();
            pc++;
        } else if (instr.tag === "POP") {
            RTS.pop();
            pc++;
        } else if (instr.tag === "JOF") {
            if (!RTS.pop()) {
                pc = instr.addr;
            } else {
                pc++;
            }
        } else if (instr.tag === "GOTO") {
            pc = instr.addr;
        } else if (instr.tag === "ENTER_SCOPE") {
            const locals = new Array(instr.num).fill(undefined);
            OS.push(locals);
            E = new Pair(E, instr.syms);
            pc++;
        } else if (instr.tag === "EXIT_SCOPE") {
            OS.pop();
            E = E.tail;
            pc++;
        } else if (instr.tag === "CALL") {
            const f = RTS.pop();
            const n = instr.arity;
            RTS.push(pc + 1);
            RTS.push(E);
            RTS.push(OS);
            RTS.push(n);
            pc = f;
            E = new Pair(E, new Map());
            OS = [];
        } else if (instr.tag === "RESET") {
            pc = RTS.pop();
            OS = RTS.pop();
            E = RTS.pop();
            pc++;
        } else if (instr.tag === "LDF") {
            const f = { addr: instr.addr, arity: instr.arity };
            RTS.push(f);
            pc++;
        } else if (instr.tag === "GOCALL") {
            const f = RTS.pop();
            const n = instr.arity;
            RTS.push(pc + 1);
            RTS.push(E);
            RTS.push(OS);
            RTS.push(n);
            pc = f.addr;
            E = new Pair(E, new Map());
            OS = [];
        } else if (instr.tag === "CREATE_CHAN") {
            RTS.push([]);
            pc++;
        } else if (instr.tag === "USE_CHANNEL") {
            const channel = RTS.pop();
            const value = RTS.pop();
            channel[instr.left] = value;
            pc++;
        } else {
            throw new TypeError(`Unknown instruction: ${instr.tag}`);
        }
    }
}
