import parse from "./parser";
import compile from "./compiler";
import { GoVM } from "./vm";

const run_program = async (programStr: string, heapSize: number = 100000) => {
	let vm = new GoVM(heapSize);
	let ast = parse(programStr);
	let instrs = compile(ast);
	return vm.run(instrs);
}

export default run_program;

const programStr = 
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
`;
run_program(programStr).then((res) => console.log(res));