import parse from "./parser";
import compile from "./compiler";
import { GoVM } from "./vm";
import { JSValue } from "./utils/type_utils";

const programStr: string = 
`
package main

import "fmt"

var c chan int

func f(x int) {
	c <- x
}

func main() {
	c = make(chan int)
	go f(4)
	x := <-c
	fmt.Println(x)
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