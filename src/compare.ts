/**
 * This module contains functionality common to both the equal and diff modules.
 * Feel free to subclass it if you need other comparison type algorithms.
 * Please note that whenever possible, this module follows the convention found in String.prototype.localeCompare and the comparison function of Array.prototype.sort.
 *  -1 means less than,
 *   0 means equal
 *   1 means greater than
 */
import {ObjPropType} from './discover';
import {GraphNode, Visitor, VisitorContext, VisitorOptions} from './visit';

// See module documentation above.
export const IS_SAME = null;    // Same does imply equality, but internally we track the difference.

// Note the inversion to comply with the module documentation above.  0 (aka falsy) indicates equality.  These constants help reduce confusing the inversion.
export const IS_EQUAL_B = false;
export const NOT_EQUAL = true;

// These constants make clear the convention discussed in the module documentation above.
export const IS_LT = -1;
export const IS_EQUAL_N = 0;
export const IS_GT = 1;

/**
 * Returns true if the specified variable signifies "equality".
 * Please see module documentation above.
 */
export const IS_EQUAL = function (v: boolean | number) {
	// null, false, and zero results are all considered and indication of equality.
	return !v;
};

/**
 * Common options for comparing two object graphs.
 */
export interface CompareOptions extends VisitorOptions {
	/**
	 * If two values are *not* of the same type, and this is true, the values will be compared for equality using the double equals operator.
	 */
	looseEquality?: boolean;
	/**
	 * Allows for equality comparison of floating point values that are "close".  Override as needed to suit your application.
	 * Default value is Number.EPSILON.
	 */
	epsilon?: number;
	/**
	 * Consider arrays to be equal if they contain all the same elements.
	 * Default value is false (array ordering is significant).
	 */
	laxArrayOrdering?: boolean;
	/**
	 * ES6 Maps remember their previousValue insertion order.
	 * Default value is false (ignore insertion order).
	 */
	strictMapOrdering?: boolean;
	/**
	 * ES6 Sets remember their previousValue insertion order.
	 * Default value is false (ignore insertion order).
	 */
	strictSetOrdering?: boolean;
}

/**
 * Comparison occurs within a context, this describes that internal context.
 */
export interface CompareContext extends VisitorContext {
	/**
	 * Keeps track of the current state of comparison as the algorithm runs.
	 */
	result: number | boolean;
	/**
	 * Internally maintained value which is set to true *only* when searching (aka comparing) elements of a container to see if the containers are loosely equal.
	 */
	searching?: boolean;
	/**
	 * The result of an internal container search @see CompareContext.searching.
	 */
	searchResult?: number | boolean;
}

/**
 * It's okay to declare our overridden methods as taking a specialized GraphNode, because since both are interfaces and that doesn't translate to JavaScript anyway.
 */
export interface CompareNode<T = any> extends GraphNode {
	lhs: GraphNode<T>;
}

/**
 * Internal interface used by laxArrayOrdering
 */
interface ArrayMatch {
	lhIdx: number;
	rhIdx: number;
}

/**
 * Abstract algorithm for comparing the nodes of two object graphs.
 * @inheritDoc
 * This class just walks the rhs object graph.  It creates a lhs Node for each rhs Node that it visits, and hangs the lhs Node onto it's rhs counterpart.
 * When @see Visitor.visit is called, this class intercepts that call, grabs the lhs Node that has already been hung on the node to be visited, and calls @see Compare.compare instead.
 */
export class Compare extends Visitor implements CompareOptions {
	/**
	 * Initialize the common elements of a comparison algorithm.
	 */
	protected constructor(opts?: CompareOptions) {
		super(opts);
		if (opts?.looseEquality)
			this.looseEquality = !!opts.looseEquality;
		if (typeof opts?.epsilon === 'number')
			this.epsilon = opts.epsilon;
		if (opts?.laxArrayOrdering)
			this.laxArrayOrdering = !!opts.laxArrayOrdering;
		if (opts?.strictMapOrdering)
			this.strictMapOrdering = !!opts.strictMapOrdering;
		if (opts?.strictSetOrdering)
			this.strictSetOrdering = !!opts.strictSetOrdering;
	}
	/**
	 * @inheritDoc
	 */
	public readonly looseEquality?: boolean;
	/**
	 * @inheritDoc
	 */
	public readonly epsilon?: number;
	/**
	 * @inheritDoc
	 */
	public readonly laxArrayOrdering?: boolean;
	/**
	 * @inheritDoc
	 */
	public readonly strictMapOrdering?: boolean;
	/**
	 * @inheritDoc
	 */
	public readonly strictSetOrdering?: boolean;

	/**
	 * @inheritDoc
	 * This specialization further initializes the context for a new comparison.
	 */
	protected createContext(...args: any) {
		let retVal = <CompareContext>super.createContext(args);
		retVal.searching = false;
		return retVal;
	}

	/**
	 * Main entry point for subclasses, this method compares to object graphs for equality
	 */
	protected compare(lhs: GraphNode, rhs: GraphNode, ctx: CompareContext): boolean | GraphNode {
		if (! lhs) {
			if (rhs)
				return this.noLhs(ctx, rhs);
			else
				return this.areEqual(ctx, lhs, rhs, IS_SAME);
		}
		else if (! rhs) {
			return this.noRhs(ctx, lhs);
		}
		// If position is defined, it must match.
		if (lhs.position !== rhs.position) {
			return this.notEqual(ctx, lhs, rhs, NOT_EQUAL);
		}
		if (Object.is(lhs.value, rhs.value)) {
			return this.areEqual(ctx, lhs, rhs, IS_SAME);
		}
		if (!lhs.typeOf) {
			this.updateNodeTypeOf(lhs);
		}
		if (!rhs.typeOf) {
			this.updateNodeTypeOf(rhs);
		}
		if (lhs.typeOf === rhs.typeOf) {
			(<CompareNode>rhs).lhs = lhs;   // Glop it on so we can pick it up later.
			// We can do this because the types are the same.
			return super.visit(rhs, ctx);
		}
		else if (this.looseEquality) {
			if (lhs.value == rhs.value) {
				return this.areEqual(ctx, lhs, rhs, IS_EQUAL_B);
			}
		}
		if (lhs.typeOf === 'undefined') {
			return this.noLhs(ctx, rhs);
		}
		else if (rhs.typeOf === 'undefined') {
			return this.noRhs(ctx, lhs);
		}
		else {
			return this.notEqual(ctx, lhs, rhs, NOT_EQUAL);
		}
	}

	/**
	 * @inheritDoc
	 * This specialization bypasses the super method and ensures that a "visit" simply invokes a comparison of the lhs of an already populated rhs Node.
	 */
	protected visit(node: CompareNode, ctx: VisitorContext): boolean | GraphNode {
		return this.compare(node.lhs, node, <CompareContext>ctx);
	}

	/**
	 * This class guarantees that this method will *only* be called when lhs and rhs have the same type.
	 * Further, node is guaranteed to be the rhs node *and* to have a 'lhs' field glop'd onto it.
	 */
	protected visitOther(node: CompareNode, ctx: VisitorContext): boolean | GraphNode {
		let lhs = node.lhs;  // Pick up what we glop'd on in our 'compare' routine.
		let result;
		switch (node.typeOf) {
			case 'string':
				result = lhs.value.localeCompare(node.value);
				break;
			case 'number':
				let e = this.epsilon;
				if (typeof e !== 'number') {
					e = Number.EPSILON;
				}
				if (isNaN(lhs.value) || isNaN(node.value)) {
					result = IS_EQUAL_B;
				}
				if (Math.abs(lhs.value - node.value) < e) {
					result = IS_EQUAL_N;
				}
				if (lhs.value < node.value) {
					result = IS_LT;
				}
				else {
					result = IS_GT;
				}
				break;
			case 'regex':
				if (lhs.value.toString().localeCompare(node.value.toString())) {
					result = NOT_EQUAL;
				}
				else {
					result = IS_EQUAL_B;
				}
				break;
			case 'date':
				if (lhs.value < node.value) {
					result = IS_LT;
				}
				else if (lhs.value > node.value) {
					result = IS_GT;
				}
				else {
					result = IS_EQUAL_N;
				}
				break;
			case 'view':
				let lb = lhs.value;
				let rb = node.value;
				if (lb.byteLength !== rb.byteLength)
					result = NOT_EQUAL;
				else if (Object.is(lb.buffer, rb.buffer))
					result = IS_EQUAL_B;
				else {
					result = IS_EQUAL_B;
					let l = lb.byteLength;
					for (let i = 0; i < l; i++) {
						if (lb.getUint8(i) !== rb.getUint8(i)) {
							result = NOT_EQUAL;
							break;
						}
					}
				}
				break;
			case 'buffer':
				if (lhs.value.byteLength !== node.value.byteLength)
					result = NOT_EQUAL;
				else {
					result = IS_EQUAL_B;
					let lb = new DataView(lhs.value);
					let rb = new DataView(node.value);
					let l = lb.byteLength;
					for (let i=0; i<l; i++) {
						if (lb.getUint8(i) !== rb.getUint8(i)) {
							result = NOT_EQUAL;
							break;
						}
					}
				}
				break;
			default:
				if (Object.is(lhs.value, node.value)) {
					result = IS_SAME;
				}
				else if (this.looseEquality && lhs.value == node.value) {
					result = IS_EQUAL_B;
				}
				else if (lhs.value === node.value) {
					result = IS_EQUAL_B;
				}
				else {
					result = NOT_EQUAL;
				}
				break;
		}
		if (IS_EQUAL(result)) {
			return this.areEqual(<CompareContext>ctx, lhs, node, result);
		}
		else {
			return this.notEqual(<CompareContext>ctx, lhs, node, result);
		}
	}

	/**
	 * @inheritDoc
	 * This specialization skips the super method because two objects are considered equal if they have the same properties and values.
	 * This method checks the properties, and invokes @see Compare.noRhs and @see Compare.noLhs as appropriate.
	 * It then triggers visitation of the properties the two objects have in common.
	 */
	protected visitObject(node: CompareNode<object>, ctx: VisitorContext): boolean | GraphNode {
		let i;
		let result;
		let prop;
		let rhs = node;
		let lhs = node.lhs;  // Pick up what we glop'd on in our 'compare' routine (which is guaranteed to be CompareNode<object>)
		if (!rhs.properties) {
			this.updateObjectNodeProperties(rhs);
		}
		if (!lhs.properties) {
			this.updateObjectNodeProperties(lhs);
		}
		let sharedProps = lhs.properties.filter(x => rhs.properties.includes(x)); // Intersection
		let removedProps = lhs.properties.filter(x => !rhs.properties.includes(x));   // Difference (lhs props that are not in the rhs)
		let addedProps = rhs.properties.filter(x => !lhs.properties.includes(x)); // Difference (rhs props that are not in the lhs)
		for (i = 0; i < removedProps.length; i++) {
			prop = removedProps[i];

			result = this.noRhs(<CompareContext>ctx, super.createObjectPropertyNode(lhs.value[prop], prop, lhs, undefined, ctx));
			if (result && typeof result !== 'boolean') {
				return result;
			}
		}
		for (i = 0; i < addedProps.length; i++) {
			prop = addedProps[i];
			result = this.noLhs(<CompareContext>ctx, super.createObjectPropertyNode(rhs.value[prop], prop, rhs, undefined, ctx));
			if (result && typeof result !== 'boolean') {
				return result;
			}
		}
		for (i = 0; i < sharedProps.length; i++) {
			prop = sharedProps[i];
			// We always pass undefined for 'position' because we don't care about ordering of object properties.
			result = this.visit(this.createObjectPropertyNode(node.value[prop], prop, node, undefined, ctx), ctx);
			if (result && typeof result !== 'boolean') {
				return result;
			}
		}
		return false;   // Already visited all the children
	}
	/**
	 * @inheritDoc
	 * This specialization allows super to do its job (create a rhs Node), and then creates a matching lhs Node that it glops onto the newly create rhs Node.
	 */
	protected createObjectPropertyNode(value: any, property: ObjPropType, obj: CompareNode<object>, position: number, ctx: VisitorContext) {
		let retVal = <CompareNode>super.createObjectPropertyNode(value, property, obj, position, ctx);
		retVal.lhs = {
			value: obj.lhs.value[property],
			position: position,
			property: property,
			parentNode: obj.lhs
		};
		return retVal;
	}

	/**
	 * @inheritDoc
	 * This specialization skips the super method because two maps are considered equal if they have the same keys and values.
	 * This method checks the keys, and invokes @see Compare.noRhs and @see Compare.noLhs as appropriate.
	 * It then triggers visitation of the keys the two maps have in common.
	 */
	protected visitMap(node: CompareNode<Map<any, any>>, ctx: VisitorContext): boolean | GraphNode {
		let i;
		let result;
		let prop;
		let rhs = node;
		let lhs = node.lhs;  // Pick up what we glop'd on in our 'compare' routine (which is guaranteed to be CompareNode<Map<any,any>>)
		let sharedProps = [];
		let removedProps = [];
		let addedProps = [];
		lhs.value.forEach((value, key) => {
			if (rhs.value.has(key)) {
				sharedProps.push(key);
			}// Intersection
			else {
				removedProps.push(key);
			}    // Difference (lhs props that are not in the rhs)
		});
		rhs.value.forEach((value, key) => {
			if (!lhs.value.has(key)) {
				addedProps.push(key);
			}   // Difference (rhs props that are not in the lhs)
		});
		let strictOrdering = this.strictMapOrdering;
		for (i = 0; i < removedProps.length; i++) {
			strictOrdering = false;
			prop = removedProps[i];

			result = this.noRhs(<CompareContext>ctx, super.createMapElementNode(lhs.value.get(prop), prop, lhs, strictOrdering ? i : undefined, ctx));
			if (result && typeof result !== 'boolean') {
				return result;
			}
		}
		for (i = 0; i < addedProps.length; i++) {
			strictOrdering = false;
			prop = addedProps[i];
			result = this.noLhs(<CompareContext>ctx, super.createMapElementNode(rhs.value.get(prop), prop, rhs, strictOrdering ? i : undefined, ctx));
			if (result && typeof result !== 'boolean') {
				return result;
			}
		}
		for (i = 0; i < sharedProps.length; i++) {
			prop = sharedProps[i];
			// The only way strictOrdering could be true at this point is if the maps have the exact same elements (otherwise we shouldn't set the position).
			result = this.visit(this.createMapElementNode(node.value.get(prop), prop, node, strictOrdering ? i : undefined, ctx), ctx);
			if (result && typeof result !== 'boolean') {
				return result;
			}
		}
		return false;   // Already visited all the children
	}
	/**
	 * @inheritDoc
	 * This specialization allows super to do its job (create a rhs Node), and then creates a matching lhs Node that it glops onto the newly create rhs Node.
	 */
	protected createMapElementNode(value: any, key: any, map: CompareNode<Map<any, any>>, position: number, ctx: VisitorContext) {
		let retVal = <CompareNode>super.createMapElementNode(value, key, map, undefined, ctx);
		retVal.lhs = {
			value: map.lhs.value.get(key),
			position: position,
			property: key,
			parentNode: map.lhs
		};
		return retVal;
	}

	/**
	 * @inheritDoc
	 * This specialization skips the super method because two sets are considered equal if they have the same values.
	 * This method checks the values, and invokes @see Compare.noRhs and @see Compare.noLhs as appropriate.
	 * It then triggers visitation of the values the two sets have in common.
	 */
	protected visitSet(node: CompareNode<Set<any>>, ctx: VisitorContext): boolean | GraphNode {
		let i;
		let result;
		let rhs = node;
		let lhs = node.lhs;  // Pick up what we glop'd on in our 'compare' routine (which is guaranteed to be CompareNode<Map<any,any>>)
		let sharedValues = [];
		let removedValues = [];
		let addedValues = [];
		lhs.value.forEach((value) => {
			if (rhs.value.has(value)) {
				sharedValues.push(value);
			}// Intersection
			else {
				removedValues.push(value);
			}    // Difference (lhs props that are not in the rhs)
		});
		rhs.value.forEach((value) => {
			if (!lhs.value.has(value)) {
				addedValues.push(value);
			}   // Difference (rhs props that are not in the lhs)
		});
		let strictOrdering = this.strictSetOrdering;
		for (i = 0; i < removedValues.length; i++) {
			strictOrdering = false;
			result = this.noRhs(<CompareContext>ctx, super.createSetElementNode(removedValues[i], lhs, strictOrdering ? i : undefined, ctx));
			if (result && typeof result !== 'boolean') {
				return result;
			}
		}
		for (i = 0; i < addedValues.length; i++) {
			strictOrdering = false;
			result = this.noLhs(<CompareContext>ctx, super.createSetElementNode(addedValues[i], rhs, strictOrdering ? i : undefined, ctx));
			if (result && typeof result !== 'boolean') {
				return result;
			}
		}
		// Because paths might use set element position (which necessitates turning the set into an array), we process tail elements first (changing a set element will effectively delete it's position and append to the tail, so we need to work our way forward so as not to screw up indexes)
		for (i = sharedValues.length-1; i >= 0; i--) {
			// The only way strictOrdering could be true at this point is if the sets have the exact same elements (otherwise we shouldn't set the position).
			result = this.visit(this.createSetElementNode(sharedValues[i], node, strictOrdering ? i : undefined, ctx), ctx);
			if (result && typeof result !== 'boolean') {
				return result;
			}
		}
		return false;   // Already visited all the children
	}
	/**
	 * @inheritDoc
	 * This specialization allows super to do its job (create a rhs Node), and then creates a matching lhs Node that it glops onto the newly create rhs Node.
	 */
	protected createSetElementNode(value: any, set: CompareNode<Set<any>>, position: number, ctx: VisitorContext) {
		let retVal = <CompareNode>super.createSetElementNode(value, set, position, ctx);
		retVal.lhs = {
			value: value,   // Value is guaranteed to be the same.  Really the only reason for this entire method to be overridden is in case we are doing strict set ordering.
			position: position,
			parentNode: set.lhs
		};
		return retVal;
	}

	/**
	 * @inheritDoc
	 * This specialization skips the super method because two arrays *might* be considered equal if they have the same values.
	 * Depending on the value of @see CompareOptions.laxArrayOrdering, this method checks to see what values from the rhs are found in the lhs, and invokes @see Compare.noRhs and @see Compare.noLhs as appropriate.
	 * It then triggers comparison of the values the two arrays have in common.
	 */
	protected visitArray(node: CompareNode<Array<any>>, ctx: VisitorContext): boolean | GraphNode {
		let i;
		let l;
		let r;
		let rhs = node;
		let lhs = node.lhs;  // Pick up what we glop'd on in our 'compare' routine (which is guaranteed to be CompareNode<Map<any,any>>)
		let rhsElems = rhs.value.map(((value, index) => {
			let result = super.createArrayElementNode(value, index, rhs, this.laxArrayOrdering ? undefined : index, ctx);
			if (!result.typeOf) {
				this.updateNodeTypeOf(result);
			}
			return result;
		}));
		let lhsElems = lhs.value.map(((value, index) => {
			let result = super.createArrayElementNode(value, index, lhs, this.laxArrayOrdering ? undefined : index, ctx);
			if (!result.typeOf) {
				this.updateNodeTypeOf(result);
			}
			return result;
		}));
		if (this.laxArrayOrdering) {
			// This gets a little involved because we need to generate Changes from the tail of the array forward (so as not to change the index of tail items by manipulating head first).
			// So we compute the needed operations, then sort them and *then* generate the operations tail to head.
			let sharedIdx: ArrayMatch[] = []; // Intersection
			let removedIdx: ArrayMatch[] = [];   // Difference (lhs idx that are not in the rhs)
			let addedIdx: ArrayMatch[] = []; // Difference (rhs idx that are not in the lhs)
			let consumedRhsIdx: number[] = [];    // Since arrays could have duplicate elements, we need to keep track of the slots that have already been "matched".
			l = lhsElems.length;
			for (i = 0; i < l; i++) {
				let rhIdx = this.findIndexOf(lhsElems[i], rhsElems, consumedRhsIdx, <CompareContext>ctx);
				if (rhIdx < 0) {
					removedIdx.push({
						lhIdx: i,
						rhIdx: -1
					});
				}
				else {
					sharedIdx.push({
						lhIdx: i,
						rhIdx: rhIdx
					});
				}
			}
			// When we get here, matchedIdx will already contain the indexes of all the elements in the rhs that had matching elements in the lhs array
			if (consumedRhsIdx.length < rhsElems.length) {
				l = rhsElems.length;
				for (i = 0; i < l; i++) {
					if (consumedRhsIdx.indexOf(i) < 0) {
						addedIdx.push({
							lhIdx: -1,
							rhIdx: i
						});
					}
				}
			}
			// *Possible* Edit operation;  Sort into lhs descending order
			sharedIdx.sort((a, b) => {
				if (a.lhIdx < b.lhIdx)
					return 1;
				else if (a.lhIdx > b.lhIdx)
					return -1;
				return 0;
			});
			// This should not actually generate any Changes (because we already determined they are "shared" aka equal values), but we need to ensure that @see Compare.areEqual gets called for them.
			l = sharedIdx.length;
			for (i = 0; i < l; i++) {
				let am = sharedIdx[i];
				r = this.compare(lhsElems[am.lhIdx], rhsElems[am.rhIdx], <CompareContext>ctx);
				if (r && typeof r !== 'boolean') {
					return r;
				}
			}
			// Next we generate removals for the lhs, starting at the tail
			removedIdx.sort((a, b) => {
				if (a.lhIdx < b.lhIdx)
					return 1;
				else if (a.lhIdx > b.lhIdx)
					return -1;
				return 0;
			});
			// note this array is now in *descending* order, so we iterate forward through it.
			l = removedIdx.length;
			for (i = 0; i < l; i++) {
				let am = removedIdx[i];
				r = this.noRhs(<CompareContext>ctx, lhsElems[am.lhIdx]);
				if (r && typeof r !== 'boolean') {
					return r;
				}
			}
			// Finally we add anything needed to the lhs, AND we try to do it in such a way that the additions will match the position they had in the lhs
			// Specifally we "insert" additions into the lhs starting at the *head* and working our way to tail.
			addedIdx.sort((a, b) => {
				if (a.rhIdx < b.rhIdx)
					return -1;
				else if (a.rhIdx > b.rhIdx)
					return 1;
				return 0;
			});
			l = addedIdx.length;
			for (i = 0; i < l; i++) {
				let am = addedIdx[i];
				r = this.noLhs(<CompareContext>ctx, rhsElems[am.rhIdx]);
				if (r && typeof r !== 'boolean') {
					return r;
				}
			}
		}
		else {
			let longest = lhsElems.length > rhsElems.length ? lhsElems : rhsElems;
			// Process in reverse order so that change generation affects tail elements first
			for (i = longest.length - 1; i >= 0; i--) {
				r = this.compare(lhsElems[i], rhsElems[i], <CompareContext>ctx);
				if (r && typeof r !== 'boolean') {
					return r;
				}
			}
		}
		return false;   // Already visited all the children
	}
	/**
	 * @inheritDoc
	 * This specialization should never be called, because @see Compare.visitArray explicitly invokes our super method.
	 * Further, to properly handle @see CompareOptions.laxArrayOrdering, we delay glopping the rhs onto the lhs Node until the @see Compare.compare method.
	 */
	protected createArrayElementNode(currentValue: any, index: number, array: CompareNode<Array<any>>, position: number, ctx: VisitorContext): GraphNode {
		throw new Error('Internal logic error');    // We should only ever call our super method (see above).
	}

	/**
	 * Checks to see if an "equal" element is anywhere in the supplied array.
	 */
	protected findIndexOf(elem: GraphNode, array: GraphNode<Array<any>>[], matches: number[], ctx: CompareContext): number {
		// Only consider objects of the same type *and* whose property/slot is not already spoken for (this should speed up the search dramatically.
		let sameType = array.filter(x => x.typeOf === elem.typeOf && matches.indexOf(<number>x.property) < 0);
		if (sameType.length === 0) {
			return -1;
		}
		let found = sameType.find((p) => {
			let prevSearching = ctx.searching;
			let prevResult = ctx.searchResult;
			try {
				delete ctx.searchResult;
				ctx.searching = true;
				this.compare(elem, p, ctx);
				if (typeof ctx.searchResult !== 'undefined' && IS_EQUAL(ctx.searchResult))
					return true;
			}
			finally {
				ctx.searchResult = prevResult;
				ctx.searching = prevSearching;
			}
			return false;
		});
		if (found) {
			matches.push(<number>found.property);
			return <number>found.property;
		}
		return -1;
	}

	/**
	 * Invoked whenever both a lhs Node and a rhs Node are considered equal.
	 * The return value from this method determines whether visitation moves deeper or continues with the next sibling.
	 *
	 * @param ctx   The context of the current comparison operation.
	 * @param lhs   lhs Node
	 * @param rhs   rhs Node
	 * @param cmp   The comparison result (numeric or boolean; see module documentation above).
	 * @returns False, because no need to compare the children of equal Nodes.
	 */
	protected areEqual(ctx: CompareContext, lhs: GraphNode, rhs: GraphNode, cmp: boolean | number | null): boolean {
		if (ctx.searching) {
			if (typeof ctx.searchResult === 'undefined')
				ctx.searchResult = cmp;
		}
		else if (typeof ctx.result === 'undefined') {
			ctx.result = cmp;
		}
		return false;
	}

	/**
	 * Invoked whenever a lhs Node and a rhs Node are *not* equal.
	 *
	 * @param ctx   The context of the current comparison operation.
	 * @param lhs   lhs Node
	 * @param rhs   rhs Node
	 * @param cmp   The comparison result (numeric or boolean; see module documentation above).
	 * @returns The lhs Node, because we now know the two object graphs being analyzed are *not* equal (so visitation can be aborted).
	 */
	protected notEqual(ctx: CompareContext, lhs: GraphNode, rhs: GraphNode, cmp: boolean | number): boolean | GraphNode {
		if (ctx.searching) {
			ctx.searchResult = cmp;
		}
		else {
			ctx.result = cmp;
		}
		return lhs;
	}

	/**
	 * Invoked whenever a rhs Node with no matching lhs Node is found.
	 *
	 * @param ctx   The context of the current comparison operation.
	 * @param rhs   The rhs Node which has no lhs counterpart.
	 * @returns The rhs Node, because we now know the two object graphs being analyzed are *not* equal (so visitation can be aborted).
	 */
	protected noLhs(ctx: CompareContext, rhs: GraphNode): boolean | GraphNode {
		if (ctx.searching) {
			ctx.searchResult = NOT_EQUAL;
		}
		else {
			ctx.result = NOT_EQUAL;
		}
		return rhs;
	}

	/**
	 * Invoked whenever a lhs Node with no matching rhs Node is found.
	 *
	 * @param ctx   The context of the current comparison operation.
	 * @param lhs   The lhs Node which has no rhs counterpart.
	 * @returns The lhs Node, because we now know the two object graphs being analyzed are *not* equal (so visitation can be aborted).
	 */
	protected noRhs(ctx: CompareContext, lhs: GraphNode): boolean | GraphNode {
		if (ctx.searching) {
			ctx.searchResult = NOT_EQUAL;
		}
		else {
			ctx.result = NOT_EQUAL;
		}
		return lhs;
	}
}
