import parse from "./parser";
import compile from "./compiler";

const programStr: string = 
`
package main

func main() {
    var a int = 1
}
`

let ast = parse(programStr);
let instrs = compile(ast);
console.log(instrs);