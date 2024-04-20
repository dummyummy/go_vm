import parse from "./parser";
import compile from "./compiler";
import { GoVM } from "./vm";

const programStr: string = 
`
package main

func fib() func() int {
	a, b := 0, 1
	return func() int {
		a, b = b, a+b
		return a
	}
}

func main() {
	f := fib()
	// Function calls are evaluated left-to-right.
	println(f(), f(), f(), f(), f())
}

`
console.log(programStr);

let vm = new GoVM(100000);

let ast = parse(programStr);
let instrs = compile(ast);
let result = vm.run(instrs);

console.log(result);