import { JSValue } from "../utils/type_utils"
import { is_boolean, is_null, is_number, is_string, is_undefined } from "../utils/type_utils"

// Add values destructively to the end of the given array; return the array
export function push<T>(array: T[], ...items: T[]): T[] {
    // Fixed by Liew Zhao Wei, see Discussion 5
    array.push(...items);
    return array;
}

// Return the last element of given array without changing the array
export function peek<T>(array: T[], address: number): T {
    return array[array.length - 1 - address];
}

function word_to_string(word: number): string {
    const buf = new ArrayBuffer(8);
    const view = new DataView(buf);
    view.setFloat64(0, word);
    let binStr = "";
    for (let i = 0; i < 8; i++) {
        binStr += ("00000000" + view.getUint8(i).toString(2)).slice(-8) + " ";
    }
    return binStr;
};

const word_size: number = 8;
const size_offset: number = 5;

enum HeapNodeTag {
    False_tag = 0,
    True_tag = 1,
    Number_tag = 2,
    Null_tag = 3,
    Unassigned_tag = 4,
    Undefined_tag = 5,
    Blockframe_tag = 6,
    Callframe_tag = 7,
    Closure_tag = 8,
    Frame_tag = 9,
    Environment_tag = 10,
    Pair_tag = 11,
    Builtin_tag = 12,
    String_tag = 13,
    Channel_tag = 14
}

export type HeapAddress = number;

export class Heap {
    private data: ArrayBuffer;
    private view: DataView;

    private free: number; // free is the next free index in HEAP

    // string pool
    private stringPool: Record<string, [number, string]>;
    private hashString(str: string): number {
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) + hash + char;
            hash = hash & hash; // This operation keeps hash within JavaScript's int32 limits
        }
        return hash >>> 0; // Ensure non-negative hash as a uint32
    };

    /********* Literals' Addresses *********/
    False: HeapAddress;
    True: HeapAddress;
    Null: HeapAddress;
    Unassigned: HeapAddress;
    Undefined: HeapAddress;

    // static methods
    static make_heap(bytes: number): Heap {
        return new Heap(bytes);
    }

    constructor(bytes: number) {
        if (bytes % 8 !== 0) throw new Error("heap bytes must be divisible by 8");
        this.data = new ArrayBuffer(bytes);
        this.view = new DataView(this.data);
        this.free = 0;
        this.stringPool = {};
        this.False = this.allocate(HeapNodeTag.False_tag, 1);
        this.True = this.allocate(HeapNodeTag.True_tag, 1);
        this.Null = this.allocate(HeapNodeTag.Null_tag, 1);
        this.Unassigned = this.allocate(HeapNodeTag.Unassigned_tag, 1);
        this.Undefined = this.allocate(HeapNodeTag.Undefined_tag, 1);
    }

    /********* Start Basic Allocation Methods *********/
    allocate = (tag: number, size: number): number => {
        const address = this.free;
        this.free += size;
        this.view.setUint8(address * word_size, tag);
        this.view.setUint16(address * word_size + size_offset, size);
        return address;
    };

    get = (address: number): number => this.view.getFloat64(address * word_size);

    set = (address: number, x: number): void => {
        this.view.setFloat64(address * word_size, x);
    };

    get_child = (address: number, child_index: number): number =>
        this.get(address + 1 + child_index);

    set_child = (address: number, child_index: number, value: number): void =>
        this.set(address + 1 + child_index, value);

    get_tag = (address: number): number => this.view.getUint8(address * word_size);

    get_size = (address: number): number =>
        this.view.getUint16(address * word_size + size_offset);

    get_number_of_children = (address: number): number =>
        this.get_tag(address) === HeapNodeTag.Number_tag
            ? 0
            : this.get_size(address) - 1;

    set_byte_at_offset = (address: number, offset: number, value: number): void =>
        this.view.setUint8(address * word_size + offset, value);

    get_byte_at_offset = (address: number, offset: number): number =>
        this.view.getUint8(address * word_size + offset);

    set_2_bytes_at_offset = (address: number, offset: number, value: number): void =>
        this.view.setUint16(address * word_size + offset, value);

    get_2_bytes_at_offset = (address: number, offset: number): number =>
        this.view.getUint16(address * word_size + offset);

    set_4_bytes_at_offset = (address: number, offset: number, value: number): void =>
        this.view.setUint32(address * word_size + offset, value);

    get_4_bytes_at_offset = (address: number, offset: number): number =>
        this.view.getUint32(address * word_size + offset);
    /********* End Basic Allocation Methods *********/

    /********* Type Assertations *********/
    is_False = (address: number): boolean => this.get_tag(address) === HeapNodeTag.False_tag;
    is_True = (address: number): boolean => this.get_tag(address) === HeapNodeTag.True_tag;
    is_Boolean = (address: number): boolean => this.is_True(address) || this.is_False(address);
    is_Null = (address: number): boolean => this.get_tag(address) === HeapNodeTag.Null_tag;
    is_Unassigned = (address: number): boolean => this.get_tag(address) === HeapNodeTag.Unassigned_tag;
    is_Undefined = (address: number): boolean => this.get_tag(address) === HeapNodeTag.Undefined_tag;
    is_String = (address: number): boolean => this.get_tag(address) === HeapNodeTag.String_tag;
    is_Builtin = (address: number): boolean => this.get_tag(address) === HeapNodeTag.Builtin_tag;
    is_Closure = (address: number): boolean => this.get_tag(address) === HeapNodeTag.Closure_tag;
    is_Blockframe = (address: number): boolean => this.get_tag(address) === HeapNodeTag.Blockframe_tag;
    is_Callframe = (address: number): boolean => this.get_tag(address) === HeapNodeTag.Callframe_tag;
    is_Frame = (address: number): boolean => this.get_tag(address) === HeapNodeTag.Frame_tag;
    is_Pair = (address: number): boolean => this.get_tag(address) === HeapNodeTag.Pair_tag;
    is_Number = (address: number): boolean => this.get_tag(address) === HeapNodeTag.Number_tag;
    is_Channel = (address: number): boolean => this.get_tag(address) === HeapNodeTag.Channel_tag;
    is_GoFrame = (address: number): boolean =>
        this.get_tag(address) === HeapNodeTag.Callframe_tag && this.get_byte_at_offset(address, 1) === 1;

    /********* String Pool *********/
    allocate_String = (str: string): number => {
        const hash = this.hashString(str);
        const address_or_undefined = this.stringPool[hash];

        if (address_or_undefined !== undefined) {
            return address_or_undefined[0];
        }

        const address = this.allocate(HeapNodeTag.String_tag, 1);
        this.set_4_bytes_at_offset(address, 1, hash);

        // Store the string in the string pool
        this.stringPool[hash] = [address, str];

        return address;
    };
    get_string_hash = (address: number): number =>
        this.get_4_bytes_at_offset(address, 1);
    get_string = (address: number): string =>
        this.stringPool[this.get_string_hash(address)][1];

    address_to_JS_value = (x: number): JSValue =>
        this.is_Boolean(x)
        ? this.is_True(x)
            ? true
            : false
        : this.is_Number(x)
        ? this.get(x + 1)
        : this.is_Undefined(x)
        ? undefined
        : this.is_Unassigned(x)
        ? "<unassigned>"
        : this.is_Null(x)
        ? null
        : this.is_String(x)
        ? this.get_string(x)
        : this.is_Closure(x)
        ? "<closure>"
        : this.is_Builtin(x)
        ? "<builtin>"
        : "unknown word tag: " + word_to_string(x);

    JS_value_to_address = (x: any): number | string => // Returning string for unknown tags to accommodate for the last case
        is_boolean(x)
        ? x
        ? this.True
        : this.False
        : is_number(x)
        ? this.allocate_Number(x)
        : is_undefined(x)
        ? this.Undefined
        : is_null(x)
        ? this.Null
        : is_string(x)
        ? this.allocate_String(x)
        : "unknown word tag: " + word_to_string(x);


    allocate_Builtin = (id: number): number => {
        const address = this.allocate(HeapNodeTag.Builtin_tag, 1);
        this.set_byte_at_offset(address, 1, id);
        return address;
    };
    get_Builtin_id = (address: number): number => this.get_byte_at_offset(address, 1);

    // closure
    // [1 byte tag, 1 byte arity, 2 bytes pc, 1 byte unused,
    //  2 bytes #children, 1 byte unused]
    // followed by the address of env
    // note: currently bytes at offset 4 and 7 are not used;
    // they could be used to increase pc and #children range
    allocate_Closure = (arity: number, pc: number, env: number): number => {
        const address = this.allocate(HeapNodeTag.Closure_tag, 2);
        this.set_byte_at_offset(address, 1, arity);
        this.set_2_bytes_at_offset(address, 2, pc);
        this.set(address + 1, env);
        return address;
    };
    get_Closure_arity = (address: number): number => this.get_byte_at_offset(address, 1);
    get_Closure_pc = (address: number): number => this.get_2_bytes_at_offset(address, 2);
    get_Closure_environment = (address: number): number => this.get_child(address, 0);

    // block frame
    // [1 byte tag, 4 bytes unused,
    //  2 bytes #children, 1 byte unused]
    allocate_Blockframe = (env: number): number => {
        const address = this.allocate(HeapNodeTag.Blockframe_tag, 2);
        this.set(address + 1, env);
        return address;
    };
    get_Blockframe_environment = (address: number): number => this.get_child(address, 0);

    // call frame
    // [1 byte tag, 1 byte unused, 2 bytes pc,
    //  1 byte unused, 2 bytes #children, 1 byte unused]
    // followed by the address of env
    // Added: set first unused byte (at offset 1) to 0
    // to always distinguish from gocallframe
    allocate_Callframe = (env: number, pc: number): number => {
        const address = this.allocate(HeapNodeTag.Callframe_tag, 2);
        this.set_2_bytes_at_offset(address, 2, pc);
        this.set_byte_at_offset(address, 1, 0); // Added to make sure it is set to not gocall
        this.set(address + 1, env);
        return address;
    };
    get_Callframe_environment = (address: number): number => this.get_child(address, 0);
    get_Callframe_pc = (address: number): number => this.get_2_bytes_at_offset(address, 2);
    // Same as above but set first unused byte (at offset 1)
    // to 1 to show it's a gocall frame. 0 means normal frame
    allocate_Gocallframe = (env: number, pc: number): number => {
        const address = this.allocate(HeapNodeTag.Callframe_tag, 2);
        this.set_2_bytes_at_offset(address, 2, pc);
        this.set_byte_at_offset(address, 1, 1); // Set unused byte to 1 to show gocall
        this.set(address + 1, env);
        return address;
    };

    // environment frame
    // [1 byte tag, 4 bytes unused,
    //  2 bytes #children, 1 byte unused]
    // followed by the addresses of its values
    allocate_Frame = (number_of_values: number): number =>
        this.allocate(HeapNodeTag.Frame_tag, number_of_values + 1);

    // environment
    // [1 byte tag, 4 bytes unused,
    //  2 bytes #children, 1 byte unused]
    // followed by the addresses of its frames
    allocate_Environment = (number_of_frames: number): number =>
        this.allocate(HeapNodeTag.Environment_tag, number_of_frames + 1);

    // access environment given by address
    // using a "position", i.e. a pair of
    // frame index and value index
    get_Environment_value = (env_address: number, position: [number, number]): number => {
        const [frame_index, value_index] = position;
        const frame_address = this.get_child(env_address, frame_index);
        return this.get_child(frame_address, value_index);
    };
    set_Environment_value = (env_address: number, position: [number, number], value: number): void => {
        const [frame_index, value_index] = position;
        const frame_address = this.get_child(env_address, frame_index);
        this.set_child(frame_address, value_index, value);
    };

    // extend a given environment by a new frame:
    // create a new environment that is bigger by 1
    // frame slot than the given environment.
    // copy the frame addresses of the given
    // environment to the new environment.
    // enter the address of the new frame to end
    // of the new environment
    Environment_extend = (frame_address: number, env_address: number): number => {
        const old_size = this.get_size(env_address);
        const new_env_address = this.allocate_Environment(old_size);
        let i: number;
        for (i = 0; i < old_size - 1; i++) {
            this.set_child(new_env_address, i, this.get_child(env_address, i));
        }
        this.set_child(new_env_address, i, frame_address);
        return new_env_address;
    };

    // Added to handle goroutines
    // Copy an environment by doing like the above 
    // but without extending it
    Environment_copy = (env_address: number): number => {
        const old_size = this.get_size(env_address);
        const new_env_address = this.allocate_Environment(old_size - 1);
        for (let i = 0; i < old_size - 1; i++) {
            this.set_child(new_env_address, i, this.get_child(env_address, i));
        }
        return new_env_address;
    };

    // pair
    // [1 byte tag, 4 bytes unused,
    //  2 bytes #children, 1 byte unused]
    // followed by head and tail addresses, one word each
    allocate_Pair = (hd: number, tl: number): number => {
        const pair_address = this.allocate(HeapNodeTag.Pair_tag, 3);
        this.set_child(pair_address, 0, hd);
        this.set_child(pair_address, 1, tl);
        return pair_address;
    };


    // number
    // [1 byte tag, 4 bytes unused,
    //  2 bytes #children, 1 byte unused]
    // followed by the number, one word
    // note: #children is 0
    allocate_Number = (n: number): number => {
        const number_address = this.allocate(HeapNodeTag.Number_tag, 2);
        this.set(number_address + 1, n);
        return number_address;
    };


    // channel
    // [1 byte tag, 1 byte ready to read, 1 byte ready to write,
    // 2 bytes #children (unused), 1 byte unused]
    // followed by the value sent on the channel
    // followed by the index of a dormant routine
    // note: children is 0
    allocate_Channel = (): number => {
        const channel_address = this.allocate(HeapNodeTag.Channel_tag, 3);
        // Set ready to read and written to to 0 (false)
        this.set_byte_at_offset(channel_address, 1, 0);
        this.set_byte_at_offset(channel_address, 2, 0);
        return channel_address;
    };


    write_to_channel = (channel_address: number, value: number): void => {
        // Set written to and write value
        this.set_byte_at_offset(channel_address, 2, 1);
        this.set(channel_address + 1, value);
    };

    set_channel_read = (channel_address: number): void => {
        // Set channel to ready to read
        this.set_byte_at_offset(channel_address, 1, 1);
    };

    read_channel = (channel_address: number): number => {
        // Set ready to read from and read value
        return this.get(channel_address + 1);
    };

    is_channel_read = (channel_address: number): boolean => {
        // Check if channel is ready to read from
        const status = this.get_byte_at_offset(channel_address, 1);
        return status === 1;
    };

    is_channel_written = (channel_address: number): boolean => {
        // Check if channel has been written to
        const status = this.get_byte_at_offset(channel_address, 2);
        return status === 1;
    };

    set_channel_dormant_routine = (channel: number, routine: number): void => {
        this.set_child(channel, 1, routine);
    };

    get_channel_dormant_routine = (channel: number): number => {
        return this.get_child(channel, 1);
    };

    /********* Debugging *********/
    // for debugging: display all bits of the heap
    display = (): void => {
        console.log("heap: ");
        for (let i = 0; i < this.free; i++) {
            console.log(`${word_to_string(this.get(i))}, ${i} + " " + ${this.get(i)} `);
        }
    }
    // for debugging: display environment
    display_Environment = (env: number): void => {
        const n_children = this.get_number_of_children(env);
        const tag = this.get_tag(env);
        console.log(`======= Environment information =======`);
        console.log(`Address: ${env}`)
        console.log(`Tag: ${tag}`)
        console.log(`Number of frames: ${n_children}`)
        console.log(`Frame information`);
        for (let i = 0; i < n_children; i++) {
            const addr = this.get_child(env, i);
            console.log(`    Frame ${i}`);
            this.display_Frame(addr);
        }
        console.log(`=======================================`);
    };
    // for debugging: display frame
    display_Frame = (frame: number): void => {
        console.log(`        Address: ${frame}`);
        console.log(`        Tag: ${this.get_tag(frame)}`);
        console.log(`        Frame size: ${this.get_number_of_children(frame)}`);
        console.log(`        Children: `);
        const numberOfChildren = this.get_number_of_children(frame);
        for (let i = 0; i < numberOfChildren; i++) {
            const child = this.get_child(frame, i);
            console.log(`            Child ${i}`);
            console.log(`            Address: ${child}`);
            console.log(`            Tag: ${this.get_tag(child)}`);
            if (this.is_Number(child)) {
                console.log(`            Value: ${this.get(child + 1)}`);
            }
        }
    };
}
