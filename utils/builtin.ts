let primitive_object = new Map<string, any>()

let builtin_objects = new Map<string, any>()
let constants = new Map<string, any>()

// TODO
builtin_objects.set("make", ()=>{})
builtin_objects.set("println", ()=>{})
builtin_objects.set("pow", (x: number, y: number)=>{Math.pow(x, y)})

constants.set("nil", null)

for (const key of builtin_objects.keys()) {
    primitive_object.set(key, builtin_objects.get(key));
}

for (const key of constants.keys()) {
    primitive_object.set(key, constants.get(key));
}

export { primitive_object }