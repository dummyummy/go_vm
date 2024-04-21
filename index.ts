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