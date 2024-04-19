// conversions between addresses and JS_value
export type JSValue = boolean | number | string | undefined | null | [JSValue, JSValue] | "<unassigned>" | "<closure>" | "<builtin>";

export const is_boolean = (value: any): value is boolean => typeof value === "boolean";
export const is_number = (value: any): value is number => typeof value === "number";
export const is_undefined = (value: any): value is undefined => typeof value === "undefined";
export const is_null = (value: any): value is null => value === null;
export const is_string = (value: any): value is string => typeof value === "string";
export const is_pair = (value: any): value is [any, any] => Array.isArray(value) && value.length === 2;