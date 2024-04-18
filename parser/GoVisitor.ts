import GoBaseVisitor from "./GoBaseVisitor";

// parser contexts
import { SourceFileContext } from "./GoParser";
import { PackageClauseContext } from "./GoParser";
import { ImportDeclContext } from "./GoParser";
import { ImportSpecContext } from "./GoParser";
import { DeclarationContext } from "./GoParser";
import { ConstDeclContext } from "./GoParser";
import { ConstSpecContext } from "./GoParser";
import { IdentifierListContext } from "./GoParser";
import { ExpressionListContext } from "./GoParser";
import { FunctionDeclContext } from "./GoParser";
import { VarDeclContext } from "./GoParser";
import { VarSpecContext } from "./GoParser";
import { BlockContext } from "./GoParser";
import { StatementListContext } from "./GoParser";
import { StatementContext } from "./GoParser";
import { SimpleStmtContext } from "./GoParser";
import { ExpressionStmtContext } from "./GoParser";
import { SendStmtContext } from "./GoParser";
import { IncDecStmtContext } from "./GoParser";
import { AssignmentContext } from "./GoParser";
import { ShortVarDeclContext } from "./GoParser";
import { ReturnStmtContext } from "./GoParser";
import { BreakStmtContext } from "./GoParser";
import { ContinueStmtContext } from "./GoParser";
import { IfStmtContext } from "./GoParser";
import { ForStmtContext } from "./GoParser";
import { ForClauseContext } from "./GoParser";
import { RangeClauseContext } from "./GoParser";
import { GoStmtContext } from "./GoParser";
import { Type_Context } from "./GoParser";
import { TypeLitContext } from "./GoParser";
import { ArrayTypeContext } from "./GoParser";
import { ArrayLengthContext } from "./GoParser";
import { ElementTypeContext } from "./GoParser";
import { SliceTypeContext } from "./GoParser";
import { ChannelTypeContext } from "./GoParser";
import { FunctionTypeContext } from "./GoParser";
import { SignatureContext } from "./GoParser";
import { ResultContext } from "./GoParser";
import { ParametersContext } from "./GoParser";
import { ParameterDeclContext } from "./GoParser";
import { ExpressionContext } from "./GoParser";
import { PrimaryExprContext } from "./GoParser";
import { OperandContext } from "./GoParser";
import { LiteralContext } from "./GoParser";
import { BasicLitContext } from "./GoParser";
import { OperandNameContext } from "./GoParser";
import { FunctionLitContext } from "./GoParser";
import { ArgumentsContext } from "./GoParser";

export interface GoNode {
    node: string;
    body?: GoNode | Object | null;
    packageName?: string;
    importSpecs?: Array<GoNode | null> | null;
    importPath?: string;
    ident?: string;
    idents?: Array<string> | null;
    sign?: GoNode | null;
    params?: Array<GoNode | null> | GoNode | null;
    returnType?: Array<GoNode | null> | GoNode | string | null;
    type?: GoNode | string | null;
    statements?: Array<GoNode | null> | null;
    clause?: GoNode | null;
    init?: GoNode | null;
    post?: GoNode | null;
    expr?: GoNode | null;
    vars?: Object;
    iterable?: GoNode | null;
    decls?: Array<GoNode | null> | null;
    assigns?: GoNode | null;
    exprs?: Array<GoNode | null> | GoNode | null;
    parent?: GoNode | Object| null;
    attr?: GoNode | null;
    func?: GoNode | null;
    args?: GoNode | null;
    funcType?: GoNode | string | null;
    value?: string | null;
    pred?: GoNode | null;
    tb?: GoNode | null;
    fb?: GoNode | null;
    length?: GoNode | null;
    dir?: string | null;
    chan?: GoNode | null;
    op?:string | null;
    operand?: GoNode | null;
    lhs?: GoNode | null;
    rhs?: GoNode | null;
}

export default class GoVisitor extends GoBaseVisitor<GoNode> {
    visitSourceFile = (ctx: SourceFileContext): GoNode | null => {
        return {
            node: "Program",
            body: {
                packageClause: this.visitPackageClause(ctx.packageClause()), 
                importDecls: ctx.importDecl_list().map((decl) => {
                    return this.visitImportDecl(decl);
                }),
                functionDecls: ctx.functionDecl_list().map((decl) => {
                    return this.visitFunctionDecl(decl);
                }),
                // methodDecls: ctx.methodDecl_list().every((decl) => {
                //     return this.visitMethodDecl(decl);
                // }),
                declarationDecls: ctx.declaration_list().map((decl) => {
                    return this.visitDeclaration(decl);
                })
            }
        };
    };
    visitPackageClause = (ctx: PackageClauseContext): GoNode | null => {
        return {
            node: "PackageClause",
            packageName: ctx._packageName.text,
        };
    };
    visitImportDecl = (ctx: ImportDeclContext): GoNode | null => {
        return {
            node: "ImportClause",
            importSpecs: ctx.importSpec_list().map((decl) => {
                return this.visitImportSpec(decl);
            })
        };
    };
    visitImportSpec = (ctx: ImportSpecContext): GoNode | null => {
        return {
            node: "ImportSpec",
            importPath: ctx.importPath().getText()
        };
    };
    visitFunctionDecl = (ctx: FunctionDeclContext): GoNode | null => {
        return {
            node: "FunctionDecl",
            ident: ctx.IDENTIFIER().getText(),
            sign: this.visitSignature(ctx.signature()),
            body: this.visitBlock(ctx.block())
        };
    };
    visitSignature = (ctx: SignatureContext): GoNode | null => {
        return {
            node: "FunctionSign",
            params: this.visitParameters(ctx.parameters()),
            returnType: this.visitResult(ctx.result()),
        }
    };
    visitResult = (ctx: ResultContext): Array<GoNode | null> | GoNode | string | null => {
        return (ctx == null) ? []
            : ctx.type_()
            ? this.visitType_(ctx.type_())
            : this.visitParameters(ctx.parameters())
    };
    visitParameters = (ctx: ParametersContext): Array<GoNode | null> | null => {
        return ctx.parameterDecl_list().map((decl) => {
                return this.visitParameterDecl(decl);
            });
    };
    visitParameterDecl = (ctx: ParameterDeclContext): GoNode | null => {
        return {
            node: "ParameterDecl",
            idents: ctx.identifierList()
                ? this.visitIdentifierList(ctx.identifierList())
                : null,
            type: this.visitType_(ctx.type_())
        };
    };
    visitBlock = (ctx: BlockContext): GoNode | null => {
        return {
            node: "BlockStatement",
            body: this.visitStatementList(ctx.statementList()),
        };
    };
    visitStatementList = (ctx: StatementListContext): GoNode | null => {
        return {
            node: "StatementList",
            statements: ctx ? ctx.statement_list().map((stat) => { 
                return this.visitStatement(stat);
            }) : []
        };
    };
    visitStatement = (ctx: StatementContext): GoNode | null => {
        return ctx.declaration()
            ? this.visitDeclaration(ctx.declaration())
            // TODO
            // : ctx.labeledStmt()
            // ? this.visitLabeledStmt(ctx.labeledStmt())
            : ctx.simpleStmt()
            ? this.visitSimpleStmt(ctx.simpleStmt())
            : ctx.goStmt()
            ? this.visitGoStmt(ctx.goStmt())
            : ctx.returnStmt()
            ? this.visitReturnStmt(ctx.returnStmt())
            : ctx.breakStmt()
            ? this.visitBreakStmt(ctx.breakStmt())
            : ctx.continueStmt()
            ? this.visitContinueStmt(ctx.continueStmt())
            // : ctx.gotoStmt()
            // ? this.visitGotoStmt(ctx.gotoStmt())
            // : ctx.fallthroughStmt()
            // ? this.visitFallthroughStmt(ctx.fallthroughStmt())
            : ctx.block()
            ? this.visitBlock(ctx.block())
            : ctx.ifStmt()
            ? this.visitIfStmt(ctx.ifStmt())
            // : ctx.switchStmt()
            // ? this.visitSwitchStmt(ctx.switchStmt())
            // : ctx.selectStmt()
            // ? this.visitSelectStmt(ctx.selectStmt())
            : ctx.forStmt()
            ? this.visitForStmt(ctx.forStmt())
            // : ctx.deferStmt()
            // ? this.visitDeferStmt(ctx.deferStmt())
            : null;
    }
    visitBreakStmt = (ctx: BreakStmtContext): GoNode | null => {
        return {
            node: "BreakStatement",
        };
    };
    visitContinueStmt = (ctx: ContinueStmtContext): GoNode | null => {
        return {
            node: "ContinueStatement",
        };
    };
    visitForStmt = (ctx: ForStmtContext): GoNode | null => {
        return {
            node: "ForStatement",
            clause: ctx.forClause()
                ? this.visitForClause(ctx.forClause())
                : ctx.rangeClause()
                ? this.visitRangeClause(ctx.rangeClause())
                : null,
            body: this.visitBlock(ctx.block())
        };
    };
    visitForClause = (ctx: ForClauseContext): GoNode | null => {
        return {
            node: "ForClause",
            init: ctx._initStmt ? this.visitSimpleStmt(ctx._initStmt) : null,
            expr: this.visitExpression(ctx.expression()),
            post: ctx._postStmt ? this.visitSimpleStmt(ctx._postStmt) : null
        };
    };
    visitRangeClause = (ctx: RangeClauseContext): GoNode | null => {
        return {
            node: "RangeClause",
            vars: {
                declare: (ctx.ASSIGN() == null),
                idents: ctx.expressionList()
                    ? this.visitExpressionList(ctx.expressionList())
                    : this.visitIdentifierList(ctx.identifierList())
            },
            iterable: this.visitExpression(ctx.expression()),
        };
    };
    visitGoStmt = (ctx: GoStmtContext): GoNode | null => {
        return {
            node: "GoStatement",
            expr: this.visitExpression(ctx.expression())
        };
    };
    visitDeclaration = (ctx: DeclarationContext): GoNode | null => {
        return ctx.constDecl()
            // TODO
            ? this.visitConstDecl(ctx.constDecl())
            // ? ctx.typeDecl()
            // : this.visitTypeDecl(ctx.typeDecl())
            : ctx.varDecl()
            ? this.visitVarDecl(ctx.varDecl())
            : null;
    };
    visitConstDecl = (ctx: ConstDeclContext): GoNode | null => {
        return {
            node: "ConstDecl",
            decls: ctx.constSpec_list().map((spec) => {
                return this.visitConstSpec(spec);
            })
        };
    };
    visitVarDecl = (ctx: VarDeclContext): GoNode | null => {
        return {
            node: "VarDecl",
            decls: ctx.varSpec_list().map((spec) => {
                return this.visitVarSpec(spec);
            })
        };
    };
    visitConstSpec = (ctx: ConstSpecContext): GoNode | null => {
        return {
            node: "ConstSpec",
            idents: this.visitIdentifierList(ctx.identifierList()),
            type: this.visitType_(ctx.type_()),
            assigns: this.visitExpressionList(ctx.expressionList())
        };
    };
    visitVarSpec = (ctx: VarSpecContext): GoNode | null => {
        return {
            node: "VarSpec",
            idents: this.visitIdentifierList(ctx.identifierList()),
            type: this.visitType_(ctx.type_()),
            assigns: this.visitExpressionList(ctx.expressionList())
        };
    };

    visitExpressionList = (ctx: ExpressionListContext): GoNode | null => {
        return ctx ? {
            node: "ExpressionList",
            exprs: ctx.expression_list().map((expr) => {
                return this.visitExpression(expr);
            })
        } : null;
    };

    visitPrimaryExpr = (ctx: PrimaryExprContext): GoNode | null => {
        return ctx.operand()
            ? this.visitOperand(ctx.operand())
            // TODO: index
            // TODO: slice_
            : ctx.DOT() // access member
            ? {
                node: "MemberExpression",
                parent: this.visitPrimaryExpr(ctx.primaryExpr()),
                attr: {
                    node: "Identifier",
                    ident: ctx.IDENTIFIER().getText()
                } as GoNode
            } as GoNode
            : ctx.arguments() // apply
            ? {
                node: "CallExpression",
                func: this.visitPrimaryExpr(ctx.primaryExpr()),
                args: this.visitArguments(ctx.arguments())
            } as GoNode
            : null;
    };

    visitArguments = (ctx: ArgumentsContext): GoNode | null => {
        return {
            node: "Arguments",
            funcType: this.visitType_(ctx.type_()), // something like make(chan int)
            exprs: this.visitExpressionList(ctx.expressionList())
        }
    };

    visitExpression = (ctx: ExpressionContext): GoNode | null => {
        return ctx.primaryExpr()
            ? this.visitPrimaryExpr(ctx.primaryExpr())
            : ctx._unary_op
            ? {
                node: "UnaryOp", op: ctx._unary_op.text, 
                operand: this.visitExpression(ctx.expression(0)) 
            } as GoNode
            : ctx._mul_op
            ? { node: "BinaryOp", op: ctx._mul_op.text, 
                lhs: this.visitExpression(ctx.expression(0)), 
                rhs: this.visitExpression(ctx.expression(1))
            } as GoNode
            : ctx._add_op
            ? { node: "BinaryOp", op: ctx._add_op.text, 
                lhs: this.visitExpression(ctx.expression(0)), 
                rhs: this.visitExpression(ctx.expression(1))
            } as GoNode
            : ctx._rel_op
            ? { node: "RelOp", op: ctx._rel_op.text, 
                lhs: this.visitExpression(ctx.expression(0)), 
                rhs: this.visitExpression(ctx.expression(1))
            } as GoNode
            : ctx.LOGICAL_AND()
            ? { node: "LogicOp", op: ctx.LOGICAL_AND().getText(), 
                lhs: this.visitExpression(ctx.expression(0)), 
                rhs: this.visitExpression(ctx.expression(1))
            } as GoNode
            : { node: "LogicOp", op: ctx.LOGICAL_OR().getText(), 
                lhs: this.visitExpression(ctx.expression(0)), 
                rhs: this.visitExpression(ctx.expression(1))
            } as GoNode;
    };

    visitOperand = (ctx: OperandContext): GoNode | null => {
        return ctx.literal()
            ? this.visitLiteral(ctx.literal())
            // what is typeArgs? Generics?
            // : ctx.typeArgs()
            // ? 
            : ctx.operandName()
            ? { node: "Identifier", ident: this.visitOperandName(ctx.operandName()) } as GoNode
            : this.visitExpression(ctx.expression());
    };

    visitOperandName = (ctx: OperandNameContext): string | null => {
        return ctx.IDENTIFIER().getText();
    };

    visitLiteral = (ctx: LiteralContext): GoNode | null => {
        return ctx.basicLit()
            ? this.visitBasicLit(ctx.basicLit())
            // : ctx.compositeLit()
            // ? this.visitCompositeLit(ctx.compositeLit())
            : ctx.functionLit()
            ? this.visitFunctionLit(ctx.functionLit())
            : null;
    };

    visitFunctionLit = (ctx: FunctionLitContext): GoNode | null => {
        return {
            node: "FuncLit",
            sign: this.visitSignature(ctx.signature()),
            body: this.visitBlock(ctx.block())
        };
    };

    visitBasicLit = (ctx: BasicLitContext): GoNode | null => {
        return {
            node: "Lit",
            type: ctx.NIL_LIT()
                ? "nil"
                : ctx.integer()
                ? "integer"
                : ctx.string_()
                ? "string"
                : "float",
            value: ctx.NIL_LIT()
                ? ctx.NIL_LIT().getText()
                : ctx.integer()
                ? ctx.integer().getText()
                : ctx.string_()
                ? ctx.string_().getText()
                : ctx.FLOAT_LIT().getText()
        }
    }

    visitReturnStmt = (ctx: ReturnStmtContext): GoNode | null => {
        return {
            node: "ReturnStatement",
            exprs: this.visitExpressionList(ctx.expressionList())
        }
    }

    visitIfStmt = (ctx: IfStmtContext): GoNode | null => {
        return {
            node: "IfStatement",
            pred: this.visitExpression(ctx.expression()),
            tb: this.visitBlock(ctx.block(0)), // true branch
            fb: ctx.ifStmt()
                ? this.visitIfStmt(ctx.ifStmt())
                : this.visitBlock(ctx.block(1))
        };
    };

    visitIdentifierList = (ctx: IdentifierListContext): Array<string> => {
        return ctx.IDENTIFIER_list().map((ident) => {
            return ident.getText();
        })
    };

    visitType_ = (ctx: Type_Context): GoNode | string | null => {
        return (ctx == null) ? null
            : ctx.typeName()
            ? ctx.typeName().getText()
            : ctx.typeLit()
            ? this.visitTypeLit(ctx.typeLit())
            : this.visitType_(ctx.type_());
    };

    visitTypeLit = (ctx: TypeLitContext): GoNode | null => {
        return {
            node: "TypeLit",
            type: ctx.functionType()
                ? this.visitFunctionType(ctx.functionType())
                : ctx.channelType()
                ? this.visitChannelType(ctx.channelType())
                : ctx.arrayType()
                ? this.visitArrayType(ctx.arrayType())
        // TODO
        //     : ctx.structType()
        //     ? this.visitStructType(ctx.structType())
        //     : ctx.pointerType()
        //     ? this.visitPointerType(ctx.pointerType())
        //     : ctx.functionType()
        //     ? this.visitFunctionType(ctx.functionType())
        //     : ctx.interfaceType()
        //     ? this.visitInterfaceType(ctx.interfaceType())
                : ctx.sliceType()
                ? this.visitSliceType(ctx.sliceType())
        //     : ctx.mapType()
        //     ? this.visitMapType(ctx.mapType())
        //     : this.visitChannelType(ctx.channelType())
                : null
        };
    };

    visitFunctionType = (ctx: FunctionTypeContext): GoNode | null => {
        return {
            node: "FuncType",
            params: this.visitSignature(ctx.signature())
        };
    };

    visitArrayType = (ctx: ArrayTypeContext): GoNode | null => {
        return {
            node: "ArrayType",
            length: this.visitArrayLength(ctx.arrayLength()),
            type: this.visitElementType(ctx.elementType())
        };
    };

    visitArrayLength = (ctx: ArrayLengthContext): GoNode | null => {
        return this.visitExpression(ctx.expression());
    };

    visitSliceType = (ctx: SliceTypeContext): GoNode | null => {
        return {
            node: "SliceType",
            type: this.visitElementType(ctx.elementType())
        };
    };

    visitChannelType = (ctx: ChannelTypeContext): GoNode | null => {
        return {
            node: "ChanType",
            dir: (ctx.RECEIVE() == null)
                ? "both"
                : ctx.getChild(0).getText() == 'chan'
                ? "send"
                : "recv",
            type: this.visitElementType(ctx.elementType())
        };
    };

    visitElementType = (ctx: ElementTypeContext): GoNode | string | null => {
        return this.visitType_(ctx.type_());
    };


    visitSimpleStmt = (ctx: SimpleStmtContext): GoNode | null => {
        return ctx.incDecStmt()
            ? this.visitIncDecStmt(ctx.incDecStmt())
            : ctx.sendStmt()
            ? this.visitSendStmt(ctx.sendStmt())
            : ctx.assignment()
            ? this.visitAssignment(ctx.assignment())
            : ctx.expressionStmt()
            ? this.visitExpressionStmt(ctx.expressionStmt())
            : ctx.shortVarDecl()
            ? this.visitShortVarDecl(ctx.shortVarDecl())
            : null;
    };

    visitSendStmt = (ctx: SendStmtContext): GoNode | null => {
        return {
            node: "SendStatement",
            chan: this.visitExpression(ctx.expression(0)),
            expr: this.visitExpression(ctx.expression(1))
        };
    };

    visitShortVarDecl = (ctx: ShortVarDeclContext): GoNode | null => {
        return {
            node: "ShortVarDecl",
            idents: this.visitIdentifierList(ctx.identifierList()),
            assigns: this.visitExpressionList(ctx.expressionList())
        }
    };

    visitIncDecStmt = (ctx: IncDecStmtContext): GoNode | null => {
        return {
            node: ctx.PLUS_PLUS() ? "IncStatement" : "DecStatement",
            expr: this.visitExpression(ctx.expression())
        };
    };

    visitAssignment = (ctx: AssignmentContext): GoNode | null => {
        return {
            node: "Assignment",
            op: ctx.assign_op().getText(),
            // @ts-ignore
            idents: this.visitExpressionList(ctx.expressionList(0))["exprs"].map(
                // @ts-ignore
                item => item["ident"]
            ),
            exprs: this.visitExpressionList(ctx.expressionList(1))
        };
    };

    visitExpressionStmt = (ctx: ExpressionStmtContext): GoNode | null => {
        return this.visitExpression(ctx.expression());
    };
}