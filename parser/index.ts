import { CharStreams, CommonTokenStream } from "antlr4"
import GoLexer from "./GoLexer";
import GoParser from "./GoParser";
import GoVisitor, { GoNode } from "./GoVisitor";

export default function parse(programStr: string): GoNode {
    let inputStream = CharStreams.fromString(programStr);
    let lexer = new GoLexer(inputStream);
    let tokenStream = new CommonTokenStream(lexer);
    let parser = new GoParser(tokenStream);
    let tree = parser.sourceFile();
    console.log(tree.toStringTree(null, parser))
    let visitor = new GoVisitor();
    let result = visitor.visit(tree);
    return result;
}