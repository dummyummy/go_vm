import { GoNode } from "../parser/GoVisitor";
import Instruction from "../utils/instruction";
import { builtins, constants } from "../utils/builtin";

export type CompilationIdentifier = { name: string, const: boolean }
export type CompilationFrame = CompilationIdentifier[]
export type CompilationEnv = CompilationFrame[]

const global_compile_frame_names = builtins.concat(constants)
const global_compile_frame: CompilationFrame = []
global_compile_frame_names.forEach((val) => global_compile_frame.push({
    name: val,
    const: true
}))
const global_compile_environment = [global_compile_frame]

const compile_time_constness = (env: CompilationEnv, pos: number[]) => {
    return env[pos[0]][pos[1]].const;
}

const compile_time_environment_position = (env: CompilationEnv, x: string): [number, number] => {
    let frame_index = env.length
    while (value_index(env[--frame_index], x) === -1) { }
    return [frame_index,
        value_index(env[frame_index], x)]
}

const value_index = (frame: CompilationFrame, x: string) => {
    for (let i = 0; i < frame.length; i++) {
        if (frame[i].name === x) return i
    }
    return -1
}

const compile_time_environment_extend = (env: CompilationEnv, f: CompilationFrame): CompilationEnv => {
    //  make shallow copy of e
    let extended_env = [...env]
    extended_env.push(f)
    return extended_env
}

// scanning out the declarations from (possibly nested)
// sequences of statements, ignoring blocks
const scan_out_declarations = (block: GoNode) => {
    let idents: CompilationFrame = [];
    for (const stmt of block.statements! as GoNode[]) {
        if (stmt.node == 'VarDecl' || stmt.node == 'ConstDecl') {
            let decls: CompilationFrame = [];
            for (const spec of stmt.decls!) {
                decls.push(...(spec!.idents!).map((val) => {
                    return { name: val, const: stmt.node == 'ConstDecl' } as CompilationIdentifier;
                }));
            }
            idents.push(...decls);
        } else if (stmt.node == 'FunctionDecl') {
            idents.push({ name: stmt.ident!, const: true });
        } else if (stmt.node == 'ShortVarDecl') {
            idents.push(...(stmt!.idents!).map((val) => {
                return { name: val, const: false } as CompilationIdentifier;
            }));
        }
    }
    return idents;
}

function unpack_param_decls(params: GoNode[]): [(CompilationIdentifier | null)[], string[]] {
    let idents = new Array<CompilationIdentifier | null>()
    let types = new Array<string>()
    if(!(params instanceof Array))
        params = [params]
    for (const param_spec of params) {
        if (param_spec.idents != null) {
            idents.push(...param_spec.idents!.map((val) => {
                return { name: val, const: false };
            }))
            types.push(...(new Array(param_spec.idents!.length)).fill(param_spec.type))
        } else {
            idents.push(null)
            types.push(param_spec.type as string)
        }
    }
    return [idents, types]
}

export function compile(ast: GoNode, ce: CompilationEnv = global_compile_environment, instructions: Instruction[] = []) {
    switch (ast.node) {
        case "Program":
            let declarationDecls = (ast.body as any)["declarationDecls"] as GoNode[];
            let functionDecls = (ast.body as any)["functionDecls"] as GoNode[];
            compile({
                node: 'BlockStatement',
                body: {
                    node: "StatementList",
                    statements: declarationDecls.concat(functionDecls).concat([{
                        node: "CallExpression",
                        func: { node: "Identifier", ident: "main" },
                        args: { node: "Arguments", funcType: null, exprs: null }
                    }])
                }
            }, ce, instructions);
            break;
        case "Lit":
            instructions.push({
                tag: "LDC",
                val: ast.type == 'nil'
                    ? null
                    : ast.type == 'integer'
                    ? parseInt(ast.value!)
                    : ast.type == 'string'
                    ? ast.value!
                    : ast.type == 'bool'
                    ? ast.value == 'true'
                    : parseFloat(ast.value!)
            })
            break;
        case "FunctionDecl":
            compile({
                node: 'ConstSpec',
                idents: [ast.ident!],
                assigns: {
                    node: 'ExpressionList',
                    exprs: [{
                        node: 'FuncLit',
                        sign: ast.sign!,
                        body: ast.body!
                    }]
                }
            }, ce, instructions);
            break;
        case "BlockStatement":
            const locals = scan_out_declarations(ast.body as GoNode)
            instructions.push({
                tag: 'ENTER_SCOPE',
                num: locals.length
            });
            compile(ast.body as GoNode, compile_time_environment_extend(ce, locals), instructions);
            instructions.push({
                tag: 'EXIT_SCOPE',
            });
            break;
        case "StatementList":
            let first = true;
            for (const stmt of ast.statements!) {
                first ? first = false : instructions.push({ tag: 'POP' });
                compile(stmt as GoNode, ce, instructions);
            }
            break;
        case "BreakStatement":
            instructions.push( { tag: "BREAK" } );
            break;
        case "ContinueStatement":
            instructions.push( { tag: "CONT" } );
            break;
        case "ForStatement":
            var for_clauses: GoNode[] = []
            if (ast.clause == null) {
                ast.clause = {
                    node: "ForClause",
                    init: null,
                    expr: { node: 'Lit', type: 'bool', value: 'true' },
                    post: null
                } as GoNode
            }
            if (ast.clause.expr == null) {
                ast.clause.expr = { node: 'Lit', type: 'bool', value: 'true' };
            }
            if (ast.clause?.init) for_clauses.push(ast.clause.init);
            if (ast.clause?.expr) for_clauses.push(ast.clause.expr);
            if (ast.clause?.post) for_clauses.push(ast.clause.post);
            var new_block = {
                node: "BlockStatement",
                body: {
                    node: "StatementList",
                    statements: for_clauses.concat(
                        ...(((ast.body as GoNode).body as GoNode).statements as GoNode[])
                    )
                }
            } as GoNode
            const for_locals = scan_out_declarations(new_block.body as GoNode);
            var for_ce = compile_time_environment_extend(ce, for_locals);
            instructions.push({
                tag: 'ENTER_SCOPE',
                num: for_locals.length
            });
            if (ast.clause?.init) {
                compile(ast.clause.init, for_ce, instructions);
                instructions.push({ tag: 'POP' });
            }
            const for_jmp_addr = instructions.length;
            if (ast.clause?.expr) {
                compile(ast.clause.expr, for_ce, instructions);
            }
            const for_jof = { tag: 'JOF' } as Instruction;
            instructions.push(for_jof);
            compile((ast.body as GoNode).body as GoNode, for_ce, instructions);
            instructions.push({ tag: 'POP' });
            if (ast.clause?.post) {
                compile(ast.clause.post, for_ce, instructions);
                instructions.push({ tag: 'POP' });
            }
            instructions.push({ tag: 'CTAG' });
            const for_jmp = { tag: 'JMP' } as Instruction;
            for_jmp.addr = for_jmp_addr;
            instructions.push(for_jmp);
            instructions.push({ tag: 'BTAG' });
            for_jof.addr = instructions.length;
            instructions.push({ tag: 'EXIT_SCOPE' });
            instructions.push({ tag: 'LDC', val: null });
            break;
        case "GoStatement":
            if (ast.expr!.node != 'CallExpression') {
                throw new Error("Goroutine can only be a function call");
            }
            compile(ast.expr!, ce, instructions);
            instructions[instructions.length - 1].tag = 'GO';
            instructions.push({ tag:'LDC', val: true });
            break;
        case "Assignment":
            if (ast.idents!.length != (ast.exprs as GoNode).exprs?.length) {
                throw new Error("Dismatched expression count and identifier count in assignment!");
            }
            for (var i = 0; i < ast.idents!.length; i++) {
                const pos = compile_time_environment_position(ce, ast.idents![i]);
                if (compile_time_constness(ce, pos)) {
                    throw new Error("Constant can not be re-assigned!");
                }
                compile(((ast.exprs as GoNode).exprs! as GoNode[])[i], ce, instructions);
            }
            for (var i = ast.idents!.length - 1; i >= 0; i--) {
                instructions.push({
                    tag: 'ASSIGN',
                    pos: compile_time_environment_position(ce, ast.idents![i])
                });
                if (i > 0) {
                    instructions.push({ tag: 'POP' });
                }
            }
            break;
        case "ConstDecl": // fall through
        case "VarDecl":
            ast.decls?.forEach((value) => {
                compile(value!, ce, instructions);
            });
            break;
        case "ConstSpec":
            for (var i = 0; i < ast.idents!.length; i++) {
                if (ast.assigns === null || i >= (ast.assigns!.exprs! as GoNode[]).length) {
                    throw new Error("Constant variables must have initial values!");
                } else {
                    compile((ast.assigns!.exprs! as GoNode[])[i], ce, instructions);
                }
            }
            for (var i = ast.idents!.length - 1; i >= 0; i--) {
                instructions.push({
                    tag: 'ASSIGN',
                    pos: compile_time_environment_position(ce, ast.idents![i])
                });
                if (i > 0) {
                    instructions.push({ tag: 'POP' });
                }
            }
            break;
        case "VarSpec":
            for (var i = 0; i < ast.idents!.length; i++) {
                if (ast.assigns === null || i >= (ast.assigns!.exprs! as GoNode[]).length) {
                    compile({
                        node: "Lit",
                        value: ast.type == 'nil'
                            ? null
                            : ast.type == 'integer'
                            ? "0"
                            : ast.type == 'string'
                            ? ""
                            : ast.type == 'bool'
                            ? "false"
                            : null,
                        type: ast.type
                    }, ce, instructions);
                } else {
                    compile((ast.assigns!.exprs! as GoNode[])[i], ce, instructions);
                }
            }
            for (var i = ast.idents!.length - 1; i >= 0; i--) {
                instructions.push({
                    tag: 'ASSIGN',
                    pos: compile_time_environment_position(ce, ast.idents![i])
                });
                if (i > 0) {
                    instructions.push({ tag: 'POP' });
                }
            }
            break;
        case "ShortVarDecl":
            compile({
                node: "VarSpec",
                idents: ast.idents,
                assigns: ast.assigns,
            }, ce, instructions);
            break;
        case "CallExpression":
            compile(ast.func!, ce, instructions);
            let arity = 0;
            const call_instruction = { tag: 'CALL' } as Instruction;
            if (ast.args?.funcType) {
                if (['ChanType'].includes(((ast.args?.funcType as GoNode).type as GoNode).node)) {
                    call_instruction.type = ((ast.args?.funcType as GoNode).type as GoNode).type as string;
                }
                else {
                    throw new Error("Not supported type literal!");
                }
            }
            if (ast.args?.exprs) {
                ((ast.args?.exprs as GoNode).exprs as GoNode[]).forEach((val) => {
                    compile(val, ce, instructions);
                    arity++;
                });
            }
            call_instruction.arity = arity;
            instructions.push(call_instruction);
            break;
        case "Identifier":
            if (["true", "false"].includes(ast.ident!)) {
                compile({
                    node: "Lit",
                    type: "bool",
                    value: ast.ident
                }, ce, instructions);
            } else {
                instructions.push({
                    tag: "LD",
                    sym: ast.ident,
                    pos: compile_time_environment_position(ce, ast.ident!)
                });
            }
            break;
        case "UnaryOp":
            compile(ast.operand!, ce, instructions);
            instructions.push({ tag: 'UNOP', sym: ast.op! });
            break
        case "BinaryOp":
            compile(ast.lhs!, ce, instructions);
            compile(ast.rhs!, ce, instructions);
            instructions.push({ tag: 'BINOP', sym: ast.op! });
            break;
        case "RelOp":
            compile(ast.lhs!, ce, instructions);
            compile(ast.rhs!, ce, instructions);
            instructions.push({ tag: 'RELOP', sym: ast.op! });
            break;
        case "LogicOp":
            compile(ast.op == '&&'
                ? {
                    node: 'IfStatement',
                    pred: ast.lhs,
                    tb: { node: 'Lit', type: 'bool', value: 'true' },
                    fb: ast.rhs
                }
                : {
                    node: 'IfStatement',
                    pred: ast.lhs,
                    tb: ast.rhs,
                    fb: { node: 'Lit', type: 'bool', value: 'false' }
                }, ce, instructions);
            break;
        case "FuncLit":
            const [params] = unpack_param_decls(ast.sign!.params as GoNode[]);
            const [ret_params] = unpack_param_decls(ast.sign!.returnType as GoNode[]);
            instructions.push({
                tag: 'LDF',
                arity: params.length,
                ret_arity: ret_params.length,
                addr: instructions.length + 2
            });
            const jmp_instruction = { tag: 'JMP' } as Instruction;
            instructions.push(jmp_instruction);
            compile(ast.body as GoNode, 
                compile_time_environment_extend(ce, params.filter(x=>x!==null) as CompilationFrame), instructions);
            instructions.push({ tag: 'LDC', val: null });
            instructions.push({ tag: 'RESET' });
            jmp_instruction.addr = instructions.length;
            break;
        case "ReturnStatement":
            ((ast.exprs as GoNode).exprs! as GoNode[]).slice().reverse().forEach((expr) => {
                compile(expr, ce, instructions)
            })
            instructions.push({ tag: 'RESET' });
            break;
        case "IfStatement":
            compile(ast.pred!, ce, instructions);
            const jump_on_false_instruction = { tag: 'JOF' } as Instruction;
            instructions.push(jump_on_false_instruction);
            compile(ast.tb!, ce, instructions);
            const jump_instruction = { tag: 'JMP' } as Instruction;
            instructions.push(jump_instruction);
            const alternative_address = instructions.length;
            jump_on_false_instruction.addr = alternative_address;
            if (ast.fb) compile(ast.fb, ce, instructions);
            jump_instruction.addr = instructions.length;
            break;
        case "SendStatement":
            compile(ast.chan!, ce, instructions);
            const chan_pos = instructions.at(-1)?.pos;
            compile(ast.expr!, ce, instructions);
            instructions.push({ tag: 'SEND', pos: chan_pos });
            break;
        // BUG
        // inc and dec can not be simply compiled like this!
        case "IncStatement": // fall through
        case "DecStatement":
            compile({
                node: "Assignment",
                op: "=",
                idents: [ast.expr!.ident!],
                exprs: {
                    node: "ExpressionList",
                    exprs: [{
                        node: "BinaryOp",
                        op: ast.node == "IncStatement" ? "+" : "-",
                        lhs: ast.expr,
                        rhs: {
                            node: "Lit",
                            type: "integer",
                            value: "1"
                        }
                    }]
                }
            }, ce, instructions);
            break;
        default:
            instructions.push({ tag: 'NOP' });
            break;
    }
    return instructions;
}

export default compile