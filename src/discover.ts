/**
 * The purpose of this module is to discover object properties.
 * Specifically it allows for "own", "Symbol", "enumerable", and inherited property discovery.
 * This project uses this module to walk an object graph by using one of these functions (to discover the nodes of the graph).
 * Within this module,
 *      "Key" mean either string or symbol.
 *      "Name" mean only string.
 *      "Property" refers to either a field (aka value) or an accessor (aka function), where Object.prototype.propertyIsEnumerable returns true for the property.
 * NOTE:
 *      While Typescript fields are enumerable by default, accessors are not.
 *      You can add this project's @enumerable annotation to a Typescript accessor method in order to mark it as an enumerable property.
 * This page was invaluable in figuring out the key/name discovery functions:
 *      https://developer.mozilla.org/en-US/docs/Web/JavaScript/Enumerability_and_ownership_of_properties
 */

/**
 * An object property (as defined by Reflect.ownKeys).
 */
export type ObjPropType = string | symbol | number;
/**
 * Type definition for functions which return the properties of an object.
 */
export type ObjPropsFnType = (obj: object) => ObjPropType[];
/**
 * Type definition for a function that can filter property names.
 * Return true to indicate that the property *should* be included in the list, false if not.
 */
export type PropertyFilterFnType = (owner: object, prop: ObjPropType, opts?: any) => boolean;

/**
 * Internal function to walk the inheritance chain of an object, invoking the supplied callback on each super prototype.
 * This allows us to collect more than just "own" properties.
 */
function getAll(obj: object, fn: (o: object) => ObjPropType[]): ObjPropType[] {
	let retVal: ObjPropType[] = [];
	// noinspection JSAssignmentUsedAsCondition
	do {
		fn(obj).forEach(function (prop) {
			if (retVal.indexOf(prop) === -1) {
				retVal.push(prop);
			}
		});
	} while (obj = Object.getPrototypeOf(obj));
	return retVal;
}

/**
 * Returns enumerable own property names (found directly in an obj).
 */
export const ownEnumerableNames: ObjPropsFnType = Object.keys;
/**
 * Returns enumerable and non-enumerable own property names (found directly in an obj).
 */
export const ownPropertyNames: ObjPropsFnType = Object.getOwnPropertyNames;

/**
 * Returns all enumerable property names of an obj, including inherited enumerable names.
 */
export function allEnumerableNames(o: object): ObjPropType[] {
	let key: string;
	let retVal: ObjPropType[] = [];
	for (key in o) {
		// noinspection JSUnfilteredForInLoop
		retVal.push(key);
	}
	return retVal;
}

/**
 * Returns all enumerable and non-enumerable property names, including inherited enumerable and non-enumerable names
 */
export function allPropertyNames(o: object): ObjPropType[] {
	return getAll(o, Object.getOwnPropertyNames);
}

/**
 * Returns enumerable own property keys (found directly in an obj).
 */
export function ownEnumerableKeys(o: object): ObjPropType[] {
	return Reflect.ownKeys(o).filter(key => o.propertyIsEnumerable(key));
}

/**
 *** Returns enumerable and non-enumerable own property keys (found directly in an obj).
 */
export const ownPropertyKeys: ObjPropsFnType = Reflect.ownKeys;

/**
 * Returns all enumerable property keys of an obj, including inherited enumerable keys.
 */
export function allEnumerableKeys(o: object): ObjPropType[] {
	return getAll(o, ownEnumerableKeys);
}

/**
 * Returns all enumerable and non-enumerable property keys, including inherited enumerable and non-enumerable keys
 */
export function allPropertyKeys(o: object): ObjPropType[] {
	return getAll(o, Reflect.ownKeys);
}
