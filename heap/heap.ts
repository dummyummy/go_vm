/*************************
 * HEAP
 *************************/

// Add values destructively to the end of the given array; return the array
function push<T>(array: T[], ...items: T[]): T[] {
    // Fixed by Liew Zhao Wei, see Discussion 5
    array.push(...items);
    return array;
}

// Return the last element of given array without changing the array
function peek<T>(array: T[], address: number): T {
    return array[array.length - 1 - address];
}

// HEAP is an array of bytes (JS ArrayBuffer)
const word_size: number = 8;
const mega: number = 2 ** 20;

// Heap_make allocates a heap of given size (in megabytes) and returns a DataView of that,
// see https://www.javascripture.com/DataView
function heap_make(bytes: number): DataView {
    if (bytes % 8 !== 0) throw new Error("heap bytes must be divisible by 8");
    const data: ArrayBuffer = new ArrayBuffer(bytes);
    const view: DataView = new DataView(data);
    return view;
}

// We randomly pick a heap size of 1000000 bytes
let HEAP: DataView = heap_make(1000000);

// Free is the next free index in HEAP
// we keep allocating as if there was no tomorrow
let free: number = 0;

// Initialize new heap
function init_heap(size: number): void {
    free = freeStart;
}

// For debugging: display all bits of the heap
function heap_display(): void {
    console.log("heap:");
    for (let i = 0; i < free; i++) {
        console.log(`${word_to_string(heap_get(i))}, ${i} + " " + ${heap_get(i)} `);
    }
}

const size_offset: number = 5;
const word_size: number = 8; // Assuming word size if not defined in original JS

let free: number = 0; // Free should be initialized, assuming starting from 0

const heap_allocate = (tag: number, size: number): number => {
    const address = free;
    free += size;
    HEAP.setUint8(address * word_size, tag);
    HEAP.setUint16(address * word_size + size_offset, size);
    return address;
};

const heap_get = (address: number): number => HEAP.getFloat64(address * word_size);

const heap_set = (address: number, x: number): void => {
    HEAP.setFloat64(address * word_size, x);
};

const heap_get_child = (address: number, child_index: number): number =>
    heap_get(address + 1 + child_index);

const heap_set_child = (address: number, child_index: number, value: number): void =>
    heap_set(address + 1 + child_index, value);

const heap_get_tag = (address: number): number => HEAP.getUint8(address * word_size);

const heap_get_size = (address: number): number =>
    HEAP.getUint16(address * word_size + size_offset);

const heap_get_number_of_children = (address: number): number =>
    heap_get_tag(address) === Number_tag
        ? 0
        : heap_get_size(address) - 1;

const heap_set_byte_at_offset = (address: number, offset: number, value: number): void =>
    HEAP.setUint8(address * word_size + offset, value);

const heap_get_byte_at_offset = (address: number, offset: number): number =>
    HEAP.getUint8(address * word_size + offset);

const heap_set_2_bytes_at_offset = (address: number, offset: number, value: number): void =>
    HEAP.setUint16(address * word_size + offset, value);

const heap_get_2_bytes_at_offset = (address: number, offset: number): number =>
    HEAP.getUint16(address * word_size + offset);

const heap_set_4_bytes_at_offset = (address: number, offset: number, value: number): void =>
    HEAP.setUint32(address * word_size + offset, value);

const heap_get_4_bytes_at_offset = (address: number, offset: number): number =>
    HEAP.getUint32(address * word_size + offset);

const word_to_string = (word: number): string => {
    const buf = new ArrayBuffer(8);
    const view = new DataView(buf);
    view.setFloat64(0, word);
    let binStr = "";
    for (let i = 0; i < 8; i++) {
        binStr += ("00000000" + view.getUint8(i).toString(2)).slice(-8) + " ";
    }
    return binStr;
};

const False_tag: number = 0;
const True_tag: number = 1;
const Number_tag: number = 2;
const Null_tag: number = 3;
const Unassigned_tag: number = 4;
const Undefined_tag: number = 5;
const Blockframe_tag: number = 6;
const Callframe_tag: number = 7;
const Closure_tag: number = 8;
const Frame_tag: number = 9;
const Environment_tag: number = 10;
const Pair_tag: number = 11;
const Builtin_tag: number = 12;
const String_tag: number = 13;
const Channel_tag: number = 14;

let stringPool: Record<string, [number, string]> = {};

const hashString = (str: string): number => {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) + hash + char;
        hash = hash & hash; // This operation keeps hash within JavaScript's int32 limits
    }
    return hash >>> 0; // Ensure non-negative hash as a uint32
};

const False = heap_allocate(False_tag, 1);
const is_False = (address: number): boolean => heap_get_tag(address) === False_tag;

const True = heap_allocate(True_tag, 1);
const is_True = (address: number): boolean => heap_get_tag(address) === True_tag;

const is_Boolean = (address: number): boolean => is_True(address) || is_False(address);

const Null = heap_allocate(Null_tag, 1);
const is_Null = (address: number): boolean => heap_get_tag(address) === Null_tag;

const Unassigned = heap_allocate(Unassigned_tag, 1);
const is_Unassigned = (address: number): boolean => heap_get_tag(address) === Unassigned_tag;

const Undefined = heap_allocate(Undefined_tag, 1);
const is_Undefined = (address: number): boolean => heap_get_tag(address) === Undefined_tag;

// Hash any string to a 32-bit unsigned integer
const hashString = (str: string): number => {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) + hash + char; // Left shift and add character code
        hash &= hash; // Ensure it's a 32-bit integer
    }
    return hash >>> 0; // Convert to unsigned
};

const String = heap_allocate(String_tag, 1);
const is_String = (address: number): boolean => heap_get_tag(address) === String_tag;

const heap_allocate_String = (str: string): number => {
    const hash = hashString(str);
    const address_or_undefined = stringPool[hash];

    if (address_or_undefined !== undefined) {
        return address_or_undefined[0];
    }

    const address = heap_allocate(String_tag, 1);
    heap_set_4_bytes_at_offset(address, 1, hash);

    // Store the string in the string pool
    stringPool[hash] = [address, str];

    return address;
};

const heap_get_string_hash = (address: number): number =>
    heap_get_4_bytes_at_offset(address, 1);

const heap_get_string = (address: number): string =>
    stringPool[heap_get_string_hash(address)][1];

const is_Builtin = (address: number): boolean => heap_get_tag(address) === Builtin_tag;

const heap_allocate_Builtin = (id: number): number => {
    const address = heap_allocate(Builtin_tag, 1);
    heap_set_byte_at_offset(address, 1, id);
    return address;
};

const heap_get_Builtin_id = (address: number): number => heap_get_byte_at_offset(address, 1);


// closure
// [1 byte tag, 1 byte arity, 2 bytes pc, 1 byte unused,
//  2 bytes #children, 1 byte unused]
// followed by the address of env
// note: currently bytes at offset 4 and 7 are not used;
//   they could be used to increase pc and #children range
const heap_allocate_Closure = (arity: number, pc: number, env: number): number => {
    const address = heap_allocate(Closure_tag, 2);
    heap_set_byte_at_offset(address, 1, arity);
    heap_set_2_bytes_at_offset(address, 2, pc);
    heap_set(address + 1, env);
    return address;
};

const heap_get_Closure_arity = (address: number): number => heap_get_byte_at_offset(address, 1);

const heap_get_Closure_pc = (address: number): number => heap_get_2_bytes_at_offset(address, 2);

const heap_get_Closure_environment = (address: number): number => heap_get_child(address, 0);

const is_Closure = (address: number): boolean => heap_get_tag(address) === Closure_tag;

// block frame
// [1 byte tag, 4 bytes unused,
//  2 bytes #children, 1 byte unused]
const heap_allocate_Blockframe = (env: number): number => {
    const address = heap_allocate(Blockframe_tag, 2);
    heap_set(address + 1, env);
    return address;
};

const heap_get_Blockframe_environment = (address: number): number => heap_get_child(address, 0);

const is_Blockframe = (address: number): boolean => heap_get_tag(address) === Blockframe_tag;

// call frame
// [1 byte tag, 1 byte unused, 2 bytes pc,
//  1 byte unused, 2 bytes #children, 1 byte unused]
// followed by the address of env
// Added: set first unused byte (at offset 1) to 0
// to always distinguish from gocallframe
const heap_allocate_Callframe = (env: number, pc: number): number => {
    const address = heap_allocate(Callframe_tag, 2);
    heap_set_2_bytes_at_offset(address, 2, pc);
    heap_set_byte_at_offset(address, 1, 0); // Added to make sure it is set to not gocall
    heap_set(address + 1, env);
    return address;
};

// Same as above but set first unused byte (at offset 1)
// to 1 to show it's a gocall frame. 0 means normal frame
const heap_allocate_Gocallframe = (env: number, pc: number): number => {
    const address = heap_allocate(Callframe_tag, 2);
    heap_set_2_bytes_at_offset(address, 2, pc);
    heap_set_byte_at_offset(address, 1, 1); // Set unused byte to 1 to show gocall
    heap_set(address + 1, env);
    return address;
};

const heap_get_Callframe_environment = (address: number): number => heap_get_child(address, 0);

const heap_get_Callframe_pc = (address: number): number => heap_get_2_bytes_at_offset(address, 2);

const is_Callframe = (address: number): boolean => heap_get_tag(address) === Callframe_tag;

const is_Gocallframe = (address: number): boolean =>
    heap_get_tag(address) === Callframe_tag && heap_get_byte_at_offset(address, 1) === 1;

// environment frame
// [1 byte tag, 4 bytes unused,
//  2 bytes #children, 1 byte unused]
// followed by the addresses of its values
const heap_allocate_Frame = (number_of_values: number): number =>
    heap_allocate(Frame_tag, number_of_values + 1);

const is_Frame = (address: number): boolean => heap_get_tag(address) === Frame_tag;

const heap_Frame_display = (address: number): void => {
    console.log("Frame: ");
    const size = heap_get_number_of_children(address);
    console.log(`frame size: ${size}`);
    for (let i = 0; i < size; i++) {
        console.log(`value address: ${i}`);
        const value = heap_get_child(address, i);
        console.log(`value: ${value}`);
        console.log(`value word: ${word_to_string(value)}`);
    }
};

// environment
// [1 byte tag, 4 bytes unused,
//  2 bytes #children, 1 byte unused]
// followed by the addresses of its frames
const heap_allocate_Environment = (number_of_frames: number): number =>
    heap_allocate(Environment_tag, number_of_frames + 1);

// access environment given by address
// using a "position", i.e. a pair of
// frame index and value index
const heap_get_Environment_value = (env_address: number, position: [number, number]): number => {
    const [frame_index, value_index] = position;
    const frame_address = heap_get_child(env_address, frame_index);
    return heap_get_child(frame_address, value_index);
};

const heap_set_Environment_value = (env_address: number, position: [number, number], value: number): void => {
    const [frame_index, value_index] = position;
    const frame_address = heap_get_child(env_address, frame_index);
    heap_set_child(frame_address, value_index, value);
};

// extend a given environment by a new frame:
// create a new environment that is bigger by 1
// frame slot than the given environment.
// copy the frame addresses of the given
// environment to the new environment.
// enter the address of the new frame to end
// of the new environment
const heap_Environment_extend = (frame_address: number, env_address: number): number => {
    const old_size = heap_get_size(env_address);
    const new_env_address = heap_allocate_Environment(old_size);
    let i: number;
    for (i = 0; i < old_size - 1; i++) {
        heap_set_child(new_env_address, i, heap_get_child(env_address, i));
    }
    heap_set_child(new_env_address, i, frame_address);
    return new_env_address;
};

const display_Environment = (env: number): void => {
    const n_children = heap_get_number_of_children(env);
    const tag = heap_get_tag(env);
    console.log(`======= Environment information =======`);
    console.log(`Address: ${env}`)
    console.log(`Tag: ${tag}`)
    console.log(`Number of frames: ${n_children}`)
    console.log(`Frame information`);
    for (let i = 0; i < n_children; i++) {
        const addr = heap_get_child(env, i);
        console.log(`	Frame ${i}`);
        heap_Frame_display(addr);
    }
    console.log(`=======================================`);
};
const display_Frame = (frame: number): void => {
    console.log(`        Address: ${frame}`);
    console.log(`        Tag: ${heap_get_tag(frame)}`);
    console.log(`        Frame size: ${heap_get_number_of_children(frame)}`);
    console.log(`        Children: `);
    const numberOfChildren = heap_get_number_of_children(frame);
    for (let i = 0; i < numberOfChildren; i++) {
        const child = heap_get_child(frame, i);
        console.log(`            Child ${i}`);
        console.log(`            Address: ${child}`);
        console.log(`            Tag: ${heap_get_tag(child)}`);
        if (is_Number(child)) {
            console.log(`            Value: ${heap_get(child + 1)}`);
        }
    }
};

// Added to handle goroutines
// Copy an environment by doing like the above 
// but without extending it
const heap_Environment_copy = (env_address: number): number => {
    const old_size = heap_get_size(env_address);
    const new_env_address = heap_allocate_Environment(old_size - 1);
    for (let i = 0; i < old_size - 1; i++) {
        heap_set_child(new_env_address, i, heap_get_child(env_address, i));
    }
    return new_env_address;
};

// for debugging: display environment
const heap_Environment_display = (env_address: number): void => {
    const size = heap_get_number_of_children(env_address);
    console.log("Environment: ");
    console.log(`environment size: ${size}`);
    for (let i = 0; i < size; i++) {
        console.log(`frame index: ${i}`);
        const frame = heap_get_child(env_address, i);
        display_Frame(frame);
    }
};

// pair
// [1 byte tag, 4 bytes unused,
//  2 bytes #children, 1 byte unused]
// followed by head and tail addresses, one word each
const heap_allocate_Pair = (hd: number, tl: number): number => {
    const pair_address = heap_allocate(Pair_tag, 3);
    heap_set_child(pair_address, 0, hd);
    heap_set_child(pair_address, 1, tl);
    return pair_address;
};

const is_Pair = (address: number): boolean => heap_get_tag(address) === Pair_tag;

// number
// [1 byte tag, 4 bytes unused,
//  2 bytes #children, 1 byte unused]
// followed by the number, one word
// note: #children is 0
const heap_allocate_Number = (n: number): number => {
    const number_address = heap_allocate(Number_tag, 2);
    heap_set(number_address + 1, n);
    return number_address;
};

const is_Number = (address: number): boolean => heap_get_tag(address) === Number_tag;

// channel
// [1 byte tag, 1 byte ready to read, 1 byte ready to write,
// 2 bytes #children (unused), 1 byte unused]
// followed by the value sent on the channel
// followed by the index of a dormant routine
// note: children is 0
const heap_allocate_Channel = (): number => {
    const channel_address = heap_allocate(Channel_tag, 3);
    // Set ready to read and written to to 0 (false)
    heap_set_byte_at_offset(channel_address, 1, 0);
    heap_set_byte_at_offset(channel_address, 2, 0);
    return channel_address;
};

const is_Channel = (address: number): boolean => heap_get_tag(address) === Channel_tag;

const heap_write_to_channel = (channel_address: number, value: number): void => {
    // Set written to and write value
    heap_set_byte_at_offset(channel_address, 2, 1);
    heap_set(channel_address + 1, value);
};

const heap_set_channel_read = (channel_address: number): void => {
    // Set channel to ready to read
    heap_set_byte_at_offset(channel_address, 1, 1);
};

const heap_read_channel = (channel_address: number): number => {
    // Set ready to read from and read value
    return heap_get(channel_address + 1);
};

const heap_is_channel_read = (channel_address: number): boolean => {
    // Check if channel is ready to read from
    const status = heap_get_byte_at_offset(channel_address, 1);
    return status === 1;
};

const heap_is_channel_written = (channel_address: number): boolean => {
    // Check if channel has been written to
    const status = heap_get_byte_at_offset(channel_address, 2);
    return status === 1;
};

const heap_set_channel_dormant_routine = (channel: number, routine: number): void => {
    heap_set_child(channel, 1, routine);
};

const heap_get_channel_dormant_routine = (channel: number): number => {
    return heap_get_child(channel, 1);
};

// conversions between addresses and JS_value
type JSValue = boolean | number | string | undefined | null | [JSValue, JSValue] | "<unassigned>" | "<closure>" | "<builtin>";

const address_to_JS_value = (x: number): JSValue =>
    is_Boolean(x)
        ? is_True(x)
            ? true
            : false
        : is_Number(x)
        ? heap_get(x + 1)
        : is_Undefined(x)
        ? undefined
        : is_Unassigned(x)
        ? "<unassigned>"
        : is_Null(x)
        ? null
        : is_String(x)
        ? heap_get_string(x)
        : is_Pair(x)
        ? [
              address_to_JS_value(heap_get_child(x, 0)),
              address_to_JS_value(heap_get_child(x, 1)),
          ]
        : is_Closure(x)
        ? "<closure>"
        : is_Builtin(x)
        ? "<builtin>"
        : "unknown word tag: " + word_to_string(x);

const is_boolean = (value: any): value is boolean => typeof value === "boolean";
const is_number = (value: any): value is number => typeof value === "number";
const is_undefined = (value: any): value is undefined => typeof value === "undefined";
const is_null = (value: any): value is null => value === null;
const is_string = (value: any): value is string => typeof value === "string";
const is_pair = (value: any): value is [any, any] => Array.isArray(value) && value.length === 2;

// Assuming head and tail functions extract the first and second element of a pair
const head = ([h, _]: [JSValue, JSValue]): JSValue => h;
const tail = ([_, t]: [JSValue, JSValue]): JSValue => t;

const JS_value_to_address = (x: any): number | string => // Returning string for unknown tags to accommodate for the last case
    is_boolean(x)
        ? x
            ? True
            : False
        : is_number(x)
        ? heap_allocate_Number(x)
        : is_undefined(x)
        ? Undefined
        : is_null(x)
        ? Null
        : is_string(x)
        ? heap_allocate_String(x)
        : is_pair(x)
        ? heap_allocate_Pair(
              JS_value_to_address(head(x)),
              JS_value_to_address(tail(x)),
          )
        : "unknown word tag: " + word_to_string(x);


/* ************************
 * Compile-time Environment
 * ************************/

// A compile-time environment is an array of
// compile-time frames, and a compile-time frame
// is an array of symbols (represented as strings)

type CompileTimeFrame = string[];
type CompileTimeEnvironment = CompileTimeFrame[];

// Find the position [frame-index, value-index]
// of a given symbol x
const compile_time_environment_position = (env: CompileTimeEnvironment, x: string): [number, number] => {
    let frame_index = env.length;
    while (value_index(env[--frame_index], x) === -1 && frame_index > 0) {}
    return [frame_index, value_index(env[frame_index], x)];
};

const value_index = (frame: CompileTimeFrame, x: string): number => {
    for (let i = 0; i < frame.length; i++) {
        if (frame[i] === x) return i;
    }
    return -1;
};

// Placeholder for display function
const display = (value: any): void => {
    console.log(value);
};

// Placeholder for get_time function
const get_time = (): number => {
    return new Date().getTime();
};

// Placeholder for error function
const error = (message: any): void => {
    throw new Error(message.toString());
};

// Math.sqrt function
const math_sqrt = (value: number): number => {
    return Math.sqrt(value);
};

// Operand Stack as a placeholder
interface OperandStack {
    pop(): number;
    push(item: number): void;
}

const OS: OperandStack = {
    stack: [],
    pop() {
        return this.stack.pop()!;
    },
    push(item: number) {
        this.stack.push(item);
    },
};

// In this machine, the builtins take their
// arguments directly from the operand stack,
// to save the creation of an intermediate
// argument array
const builtin_object: { [key: string]: () => number | void } = {
    display: () => {
        const address = OS.pop();
        display(address_to_JS_value(address));
        return address;
    },
    get_time: () => JS_value_to_address(get_time()),
    error: () => error(address_to_JS_value(OS.pop())),
    is_number: () => is_Number(OS.pop()) ? True : False,
    is_boolean: () => is_Boolean(OS.pop()) ? True : False,
    is_undefined: () => is_Undefined(OS.pop()) ? True : False,
    is_string: () => is_String(OS.pop()) ? True : False,
    is_function: () => is_Closure(OS.pop()),
    math_sqrt: () => JS_value_to_address(math_sqrt(address_to_JS_value(OS.pop()))),
    pair: () => {
        const tl = OS.pop();
        const hd = OS.pop();
        return heap_allocate_Pair(hd, tl);
    },
    is_pair: () => is_Pair(OS.pop()) ? True : False,
    head: () => heap_get_child(OS.pop(), 0),
    tail: () => heap_get_child(OS.pop(), 1),
    is_null: () => is_Null(OS.pop()) ? True : False,
    set_head: () => {
        const val = OS.pop();
        const p = OS.pop();
        heap_set_child(p, 0, val);
    },
    set_tail: () => {
        const val = OS.pop();
        const p = OS.pop();
        heap_set_child(p, 1, val);
    },
};

const primitive_object: Record<string, unknown> = {};

const compile_time_environment_extend = (vs: any, e: any): any => {
    // Make a shallow copy of e and add the new frame
    return push([...e], vs);
};

const freeStart = free;
