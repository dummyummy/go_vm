export enum OpCodes {
    LDC,    // load basic literal
    LDF,    // load function literal
    LD,     // load identifier
    UNOP,
    BINOP,
    RELOP,
    LOGOP,
    BRT,    // offset(relative)
    BRF,    // offset(relative)
    BR,     // offset(relative)
    JMP,    // address(absolute)
    RET,
    CALL,
    POP,    // pop one element from the operand stack
    ASSIGN, // assign value to an identifier
}

export default OpCodes