import parse from "./parser";
import compile from "./compiler";
import { GoVM } from "./vm";
import { JSValue } from "./utils/type_utils";

const programStr: string = 
`
package main

func main() {
	for i := 0; i < 10; i++ {
		println(i)
		sleep(1000)
	}	
}

`
console.log(programStr);

let vm = new GoVM(100000);

let ast = parse(programStr);
let instrs = compile(ast);
let result: JSValue;
vm.run(instrs).then((value) => { result = value }).then(() => {
	// do prints here
	console.log(result);
});