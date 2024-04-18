import { GoNode } from "../parser/GoVisitor";
import Instruction from "../utils/instruction";

export type CompilationIdentifier = { name: string, const: boolean }
export type CompilationFrame = CompilationIdentifier[]
export type CompilationEnv = CompilationFrame[]

// const compile_time_constness = (env: CompilationEnv, pos: number[]) => {
//     return env[pos[0]][pos[1]];
// }

const compile_time_environment_position = (env: CompilationEnv, x: string) => {
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
                decls.push(...(spec!.idents!).map((val, ind) => {
                    return { name: val, const: stmt.node == 'ConstDecl' } as CompilationIdentifier;
                }));
            }
            idents.push(...decls);
        } else if (stmt.node == 'FunctionDecl') {
            idents.push({ name: stmt.ident!, const: true });
        }
    }
    return idents;
}

function unpack_param_decls(params: GoNode[]): [(string | null)[], string[]] {
    let idents = new Array<string | null>()
    let types = new Array<string>()
    for (const param_spec of params) {
        if (param_spec.idents != null) {
            idents.push(...param_spec.idents!)
            types.push(...(new Array(param_spec.idents!.length)).fill(param_spec.type))
        } else {
            idents.push(null)
            types.push(param_spec.type as string)
        }
    }
    return [idents, types]
}

export function compile(ast: GoNode, ce: CompilationEnv = [], instructions: Instruction[] = []) {
    switch (ast.node) {
        case "Program":
            let declarationDecls = (ast.body as any)["declarationDecls"] as GoNode[];
            let functionDecls = (ast.body as any)["functionDecls"] as GoNode[];
            compile({
                node: 'BlockStatement',
                body: {
                    node: "StatementList",
                    statements: declarationDecls.concat(functionDecls)
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
            for (const stmt of ast.statements!)
                compile(stmt as GoNode, ce, instructions)
            break;
        case "BreakStatement":
            instructions.push( { tag: "BREAK" } );
            break;
        case "ContinueStatement":
            instructions.push( { tag: "CONT" } );
            break;
        case "ForStatement":
            break;
        case "GoStatement":
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
                instructions.push({
                    tag: 'ASSIGN',
                    pos: compile_time_environment_position(ce, ast.idents![i])
                });
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
                            : null
                    }, ce, instructions);
                } else {
                    compile((ast.assigns!.exprs! as GoNode[])[i], ce, instructions);
                }
                instructions.push({
                    tag: 'ASSIGN',
                    pos: compile_time_environment_position(ce, ast.idents![i])
                });
            }
            break;
        case "ShortVarDecl":
            break;
        case "CallExpression":
            break;
        case "Identifier":
            instructions.push({
                tag: "LD",
                sym: ast.ident,
                pos: compile_time_environment_position(ce, ast.ident!)
            });
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
            break;
        case "FuncLit":
            const [params] = unpack_param_decls(ast.sign!.params as GoNode[]);
            const [ret_params] = unpack_param_decls(ast.sign!.returnType as GoNode[]);
            instructions.push({
                tag: 'LDF',
                arity: params.length,
                ret_arity: ret_params.length,
                addr: instructions.length + 1
            });
            const jmp_instruction = { tag: 'JMP' } as Instruction;
            instructions.push(jmp_instruction);
            compile(ast.body as GoNode, ce, instructions);
            instructions.push({ tag: 'LDC', val: null });
            instructions.push({ tag: 'RESET' });
            jmp_instruction.addr = instructions.length;
            break;
        case "ReturnStatement":
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
            compile(ast.fb!, ce, instructions);
            jump_instruction.addr = instructions.length;
            break;
        default:
            instructions.push({ tag: 'NOP' });
            break;
    }
    return instructions;
}

export default compile