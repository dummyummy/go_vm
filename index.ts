import parse from "./parser";
import compile from "./compiler";

const programStr: string = 
`
package main

func main() {
	println("Nilakantha Series:", pi(5000))
}

// pi launches n goroutines to compute an
// approximation of pi.
func pi(n int) float64 {
	ch := make(chan float64)
	for k := 0; k < n; k++ {
		go term(ch, float64(k))
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

let ast = parse(programStr);
let instrs = compile(ast);
console.log(instrs);