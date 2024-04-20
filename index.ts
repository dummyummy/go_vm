import parse from "./parser";
import compile from "./compiler";
import { GoVM } from "./vm";
import { JSValue } from "./utils/type_utils";

var testcases: string[] = [];

testcases[0] = 
`
// Concurrent computation of pi.
// The implementation uses the Nilakantha Series.
//
// This demonstrates Go's ability to handle
// large numbers of concurrent processes.
// It is an unreasonable way to calculate pi.
package main

func main() {
	println("Nilakantha Series:", pi(50))
}

// pi launches n goroutines to compute an
// approximation of pi.
func pi(n int) float64 {
	ch := make(chan float64)
	for k := 0; k < n; k++ {
		go term(ch, k)
	}
	f := 3.0
	for k := 0; k < n; k++ {
		f += <-ch
	}
	return f
}

func term(ch chan float64, k float64) {
	ch <- 4 * pow(-1, k) / ((2*k + 2) * (2*k + 3) * (2*k + 4))
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