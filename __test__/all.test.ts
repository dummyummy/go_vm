import run_program from "..";

test("Assignment", async () => {
    const programStr = 
    `
    package main

    func main() {
        a := 4
        a *= 3
        println(a)
    }
    `;
    const result = await run_program(programStr);
    expect(result).toBe("12\n");
});

test("Continue and Break", async () => {
    const programStr = 
    `
    package main

    func main() {
        for i := 0; i < 10; i++ {
            if i < 4 {
                continue
            }
            println(i)
            if i >= 7 {
                break
            }
        }
    }
    `;
    const result = await run_program(programStr);
    expect(result).toBe("4\n5\n6\n7\n");
});

test('Fibonacci Closure', async () => {
    const programStr = 
    `
    package main

    // fib returns a function that returns
    // successive Fibonacci numbers.
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
    `;
    const result = await run_program(programStr);
    expect(result).toContain("1 1 2 3 5");
})


test('Concurrent pi', async () => {
    const programStr = 
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
    `;
    const result = await run_program(programStr);
    expect(result).toContain("3.14159");
})

test('Concurrent Prime Sieve', async () => {
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
    const result = await run_program(programStr);
    expect(result).toContain("prime 2\nprime 3\nprime 5\nprime 7\nprime 11\nprime 13\nprime 17\nprime 19\nprime 23\nprime 29");
})