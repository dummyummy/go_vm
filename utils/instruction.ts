export default interface Instruction {
    tag: string;
    val?: string | number | boolean | null;
    sym?: string;
    addr?: number;
    pos?: [number, number]; // position in the compile time environment
    arity?: number;
    ret_arity?: number;
    num?: number;

    // for funcType
    type?: string;
}