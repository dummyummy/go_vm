import parse from "./parser";

const programStr: string = 
`
// You can edit this code!
// Click here and start typing.
package main

import "fmt"

func main() {
	fmt.Println("Hello, 世界")
}
`

console.dir(parse(programStr))