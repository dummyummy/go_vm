import parse from "./parser";
import compile from "./compiler";
import { GoVM } from "./vm";
import { JSValue } from "./utils/type_utils";

var testcases: string[] = [];

testcases[0] = 
`
package main

func main() {
	println("Nilakantha Series:", pi(50))
}

func pi(n int) float64 {
	ch := make(chan float64)
	for k := 0; k < n; k++ {
		go term(ch, k)
	}
	f := 3.0
	for k := 0; k < n; k++ {
		f = f + <-ch
	}
	return f
}

func term(ch chan float64, k float64) {
	ch <- 4 * pow(-1, k) / ((2*k + 2) * (2*k + 3) * (2*k + 4))
}
`
testcases[1] = 
`
package main

func main() {
	println("Nilakantha Series:", pi(4))
}

func pi(n int) float64 {
	f := 3.0
	for k := 0; k < n; k++ {
		f = f + k
	}
	return f
}
`

let vm = new GoVM(100000);


let testcase = 0;
console.log(testcases[testcase])
let ast = parse(testcases[testcase]);
let instrs = compile(ast);
let result: JSValue;
vm.run(instrs).then((value) => { result = value }).then(() => {
	// do prints here
	console.log(result);
});