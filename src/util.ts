/**
 * This is a utility module containing misc functionality either exported or shared across the other modules of this project.
 */

const REGEX_ES6_ELEMENT_STRING = /^@@(.+)@@$/;

/**
 * Ensure we can write ES6 stuff to JSON
 * Concept from: https://2ality.com/2014/12/es6-symbols.html
 * WARNING!!! Thar be dragons here.
 *  For ES6 Symbols, we attempt to substitute '@@' + Symbol.keyFor(value) + '@@';
 *  BUT if Symbol.keyFor(value) returns undefined (and it will for Symbols not in the global registry [e.g. const x = Symbol('foo');]),
 *  we instead substitute '@@' + value.toString() + '@@';
 *  This means that the JSON will differentiate between globally registered and local Symbols (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol/keyFor).
 *  Reading them back in is a whole nuther story @see sjsonES6Reviver.
 */
export function jsonES6Replacer(key, value) {
	let t = typeof value;
	if (t === 'symbol') {
		let k = Symbol.keyFor(value);
		if (typeof k === 'undefined')
			k = value.toString();
		return '@@' + k + '@@';
	}
	if (t === 'object') {
		if (value instanceof Set) {
			return {
				'@@set@@': Array.from(value)
			};
		}
		if (value instanceof Map) {
			let m = {};
			value.forEach((v, k) => m[k] = v);
			return {
				'@@map@@': m
			};
		}
	}
	return value;
}

/**
 * Ensure we can read ES6 stuff back from JSON
 * Concept from: https://2ality.com/2014/12/es6-symbols.html
 * WARNING!!! Thar be dragons here.
 *  @see jsonES6Replacer
 *  For ES6 Symbols, if the replacer decided to use Symbol.toString,
 *  this implementation will register what WAS a local Symbol under the *global* registry
 *  (e.g. they will not be the same symbol).
 *  If this is a problem for you, you may wish to wrap this implementation in order to match up local symbols yourself.
 */
export function jsonES6Reviver(key, value) {
	let match = REGEX_ES6_ELEMENT_STRING.exec(key);
	if (match) {
		if (match[1] === 'map') {
			let retVal = new Map<any, any>();
			for (let k in value)
				if (value.hasOwnProperty(k))
					retVal.set(k, value[k]);
			return retVal;
		}
		if (match[1] === 'set') {
			let retVal = new Set<any>();
			(<[]>value).forEach(v => retVal.add(v));
			return retVal;
		}
	}
	if (typeof value === 'string') {
		match = REGEX_ES6_ELEMENT_STRING.exec(value);
		if (match) {
			let localSym = /Symbol\((.+)\)/.exec(match[1]);
			if (localSym)
				return Symbol.for(localSym[1]);
			return Symbol.for(match[1]);
		}
	}
	return value;
}

/**
 * Compute the hashcode for a string:
 * https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript
 */
export function stringHashCode(s: string): number {
	let h = 0;
	if (s)
		for (let i = 0; i < s.length; i++) {
			h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
		}
	return h;
}
