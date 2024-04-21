# Go Virtual Machine

## Setup

1. run `yarn install`.

2. run `yarn build` to build the virtual machine.

3. run `yarn test` to run all the testcases.

## Features

1. support for a subset of golang(without array, pointer, slice, struct, member access, range clause, some operators and etc.)
2. support for closure and recursive
3. directly transpile for statements to machine code without turning them into while statements
4. no type checking thus not type safe
5. low-level heap memory management
6. strings store their raw data outside the heap
7. support for go routine and channel
8. implement go routines as asynchronous operations with Javascript's async/await
9. ensure that channels are thread-safe with atomic compare_and_swap and (pseudo) spin lock
10. readers will wait on an empty channel while writers wait on a full channel
11. all go rountines will terminate themselves when main thread exits

## TODO

- `break` and `continue` instruction
- more assignment forms(`+=`, `-=` and so on)
