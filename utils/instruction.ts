export default interface Instruction {
    tag: string;
    val?: string | number | null;
    sym?: string;
    addr?: number;
    pos?: number[]; // position in the compile time environment
    arity?: number;
    ret_arity?: number;
    num?: number
}