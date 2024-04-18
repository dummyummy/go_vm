export enum OpCodes {
    NOP,
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
    JOF,    // address(absolute)
    BREAK,
    BTAG,   // break tag
    CONT,
    CTAG,   // continue tag
    RESET,  // do context switch
    RET,
    CALL,
    POP,    // pop one element from the operand stack
    ASSIGN, // assign value to an identifier
    ENTER_SCOPE,
    EXIT_SCOPE,

    GO,     // go routine
    SEND,   // send to channel
}

export default OpCodes