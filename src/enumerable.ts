/**
 * Typescript does not set PropertyDescriptor.enumerable for accessor functions.
 * Use this annotation on a Typescript accessor to make it an enumerable property.
 */
export function enumerable() {
	return function (target: any, methodName: string, descriptor: PropertyDescriptor) {
		if (typeof target !== 'object' || typeof target.constructor !== 'function' || descriptor.value) {
			throw new Error('@Enumerable applied to non-accessor');
		}
		descriptor.enumerable = true;
	};
}
