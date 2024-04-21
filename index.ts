import parse from "./parser";
import compile from "./compiler";
import { GoVM } from "./vm";
import { JSValue } from "./utils/type_utils";

var testcases: string[] = [];

testcases[0] = 
`
package main

func main() {
	println("Nilakantha Series:", pi(100))
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

// Send the sequence 2, 3, 4, ... to channel 'ch'.
func Generate(ch chan<- int) {
	for i := 2; ; i++ {
		ch <- i // Send 'i' to channel 'ch'.
	}
}

func Filter(in <-chan int, out chan<- int, prime int) {
	for {
		i := <-in // Receive value from 'in'.
		if i%prime != 0 {
			out <- i // Send 'i' to 'out'.
		}
	}
}

func main() {
	ch := make(chan int) // Create a new channel.
	go Generate(ch)      // Launch Generate goroutine.
	for i := 0; i < 10; i++ {
		prime := <-ch
		println("prime", prime)
		ch1 := make(chan int)
		go Filter(ch, ch1, prime)
		ch = ch1
	}
}
`

let vm = new GoVM(100000);

let testcase = 1;
console.log(testcases[testcase])
let ast = parse(testcases[testcase]);
let instrs = compile(ast);
console.log(instrs);
let result: JSValue;
vm.run(instrs).then((value) => { result = value }).then(() => {
	// do prints here
	console.log(result);
});