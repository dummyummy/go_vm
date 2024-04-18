export enum OpCodes {
    LDC,    // load basic literal
    LDF,    // load function literal
    LD,     // load identifier
    UNOP,
    BINOP,
    RELOP,
    BRT,    // offset(relative)
    BRF,    // offset(relative)
    BR,     // offset(relative)
    JMP,    // address(absolute)
    BREAK,
    CONT,
    RESET,
    RET,
    CALL,
    POP,    // pop one element from the operand stack
    ASSIGN, // assign value to an identifier
    GO,     // go routine
    ENTER_SCOPE,
    EXIT_SCOPE
}

export default OpCodes