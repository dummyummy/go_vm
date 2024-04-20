import { Heap, HeapAddress } from "../heap";
import Instruction from "../utils/instruction";
// @ts-ignore
import { JSValue, is_function, is_number } from "../utils/type_utils";

// Operand Stack as a placeholder
interface OperandStack<T> {
    stack: T[];
    peek(cnt: number): T | undefined;
    pop(): T | undefined;
    push(item: T): void;
}

/* ================ MICROCODE AND PRIMITIVE FUNCTIONS ================= */
const binop_microcode: Record<string, Function> = {
    "+": (x: number, y: number) => x + y,
    "*": (x: number, y: number) => x * y,
    "-": (x: number, y: number) => x - y,
    "/": (x: number, y: number) => x / y,
    "%": (x: number, y: number) => x % y,
};

const relop_microcode: Record<string, Function> = {
    "<": (x: number, y: number) => x < y,
    "<=": (x: number, y: number) => x <= y,
    ">=": (x: number, y: number) => x >= y,
    ">": (x: number, y: number) => x > y,
    "==": (x: any, y: any) => x == y,
    "!=": (x: any, y: any) => x != y,
};

const unop_microcode: Record<string, Function> = {
    "-": (x: number) => -x,
    "!": (x: boolean) => !x,
    // TODO
    // "<-": (c: channel) => read(c)
};

export class GoVM {
    PC: number = 0;
    OS: OperandStack<number> = {
        stack: [],
        peek(cnt: number) { return this.stack.length >= cnt ? this.stack.at(this.stack.length - cnt) : undefined; },
        pop() { return this.stack.length > 0 ? this.stack.pop() : undefined; },
        push(item) { this.stack.push(item); },
    };
    E: HeapAddress;
    RTS: HeapAddress[] = [];
    H: Heap; // shared heap

    private builtin_array: Function[] = [];

    constructor(heap_size: number) {
        const H = Heap.make_heap(heap_size);
        // creating global runtime environment
        const primitive_object = this.bind_builtin();
        const primitive_values = [...Object.values(primitive_object)];
        const frame_address = H.allocate_Frame(primitive_values.length);
        var builtin_id = 0;
        primitive_values.forEach((val, ind) => {
            if (is_function(val)) {
                H.set_child(frame_address, ind, H.allocate_Builtin(builtin_id++));
            } else if (is_number(val)) {
                H.set_child(frame_address, ind, H.allocate_Number(val));
            } else {
                throw new Error("Can not allocate memory for primitive value on the heap!");
            }
        });
        this.H = H;
        this.E = this.H.Environment_extend(frame_address, this.H.allocate_Environment(0));
    }

    private bind_builtin(): Record<string, Function | number> {
        // keys in builtin_funcs must retain the order in builtins(see builtin.ts)
        const builtin_funcs: Record<string, Function> = {
            make: async (arity: number) => { arity; },
            println: async (arity: number) => {
                const args = [];
                while (arity-- > 0) args.push(this.H.address_to_JS_value(this.OS.pop()!));
                args.reverse();
                console.log(...args);
                return undefined;
            },
            sleep: async (arity: number) => {
                const promise_sleep = (delay: number) => new Promise((r: Function) => setTimeout(r, delay));
                const delay = this.H.address_to_JS_value(this.OS.pop()!) as number;
                await promise_sleep(delay);
                return delay;
            },
            pow: async (arity: number) => {
                const y = this.H.address_to_JS_value(this.OS.pop()!) as number;
                const x = this.H.address_to_JS_value(this.OS.pop()!) as number;
                return this.H.JS_value_to_address(Math.pow(x, y)) as HeapAddress;
            },
        };
        const primitive_object: Record<string, Function | number> = {};
        this.builtin_array = [];
        for (const key of Object.keys(builtin_funcs)) {
            primitive_object[key] = builtin_funcs[key] as Function;
            this.builtin_array.push(builtin_funcs[key] as Function);
        }
        return primitive_object;
    }

    private apply_binop(op: string, v2: HeapAddress, v1: HeapAddress): HeapAddress {
        return this.H.JS_value_to_address(binop_microcode[op](
            this.H.address_to_JS_value(v1),
            this.H.address_to_JS_value(v2)
        )) as HeapAddress;
    }

    private apply_relop(op: string, v2: HeapAddress, v1: HeapAddress): HeapAddress {
        return this.H.JS_value_to_address(relop_microcode[op](
            this.H.address_to_JS_value(v1),
            this.H.address_to_JS_value(v2)
        )) as HeapAddress;
    }

    private apply_unop(op: string, v: HeapAddress): HeapAddress {
        return this.H.JS_value_to_address(unop_microcode[op](
            this.H.address_to_JS_value(v),
        )) as HeapAddress;
    }

    private async apply_builtin(id: number, arity: number) {
        const builtin_ret = await this.builtin_array[id](arity);
        this.OS.pop(); // pop fun
        this.OS.push(builtin_ret);
    }

    async exec(instr: Instruction) {
        switch (instr.tag) {
            case "LDC":
                this.OS.push(this.H.JS_value_to_address(instr.val) as number);
                break;
            case "UNOP":
                this.OS.push(this.apply_unop(instr.sym!, this.OS.pop()!));
                break;
            case "BINOP":
                this.OS.push(this.apply_binop(instr.sym!, this.OS.pop()!, this.OS.pop()!));
                break;
            case "RELOP":
                this.OS.push(this.apply_relop(instr.sym!, this.OS.pop()!, this.OS.pop()!));
                break;
            case "POP":
                this.OS.pop();
                break;
            case "JOF":
                this.PC = this.H.is_True(this.OS.pop()!) ? this.PC : instr.addr!;
                break;
            case "JMP":
                this.PC = instr.addr!;
                break;
            case "ENTER_SCOPE":
                this.RTS.push(this.H.allocate_Blockframe(this.E));
                var frame_address = this.H.allocate_Frame(instr.num!);
                this.E = this.H.Environment_extend(frame_address, this.E);
                for (let i = 0; i < instr.num!; i++) {
                    this.H.set_child(frame_address, i, this.H.Unassigned);
                }
                break;
            case "EXIT_SCOPE":
                this.E = this.H.get_Blockframe_environment(this.RTS.pop()!);
                break;
            case "LD":
                const val = this.H.get_Environment_value(this.E, instr.pos!);
                if (this.H.is_Unassigned(val)) {
                    throw new Error("Access of unassigned variable!");
                }
                this.OS.push(val);
                break;
            case "ASSIGN":
                this.H.set_Environment_value(this.E, instr.pos!, this.OS.peek(1)!);
                break;
            case "LDF":
                const closure_address = this.H.allocate_Closure(instr.arity!, instr.addr!, this.E);
                this.OS.push(closure_address);
                break;
            case "CALL":
                const arity = instr.arity!;
                const fun = this.OS.peek(arity + 1)!;
                if (this.H.is_Builtin(fun)) { // apply builtin function
                    const builtin_id = this.H.get_Builtin_id(fun);
                    await this.apply_builtin(builtin_id, arity);
                } else {
                    var frame_address = this.H.allocate_Frame(arity);
                    for (let i = arity - 1; i >= 0; i--) {
                        this.H.set_child(frame_address, i, this.OS.pop()!);
                    }
                    this.OS.pop(); // pop fun
                    this.RTS.push(this.H.allocate_Callframe(this.E, this.PC));
                    this.E = this.H.Environment_extend(
                        frame_address,
                        this.H.get_Closure_environment(fun),
                    );
                    this.PC = this.H.get_Closure_pc(fun);
                }
                break;
            case "RESET": 
                this.PC--;
                const top_frame = this.RTS.pop()!
                if (this.H.is_Callframe(top_frame)) {
                    // ...until top frame is a call frame
                    this.PC = this.H.get_Callframe_pc(top_frame)
                    this.E = this.H.get_Callframe_environment(top_frame)
                }
                break;
            // TODO: continue and break
            case "CTAG":
            case "BTAG":
                break;
            default:
                throw new Error("Unknown instruction " + instr.tag);
        }
    }

    async run(instrs: Instruction[]) {
        while (this.PC < instrs.length) {
            const instr = instrs[this.PC++];
            await this.exec(instr);
        }
        return this.OS.peek(1) ? this.H.address_to_JS_value(this.OS.peek(1)!) : undefined;
    }
}