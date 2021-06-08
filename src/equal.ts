/**
 * This module allows for a deep equality test between two object graphs.
 */
import {Compare, CompareContext, CompareOptions, IS_EQUAL} from './compare';
import {GraphNode} from './visit';

/**
 * @inheritDoc
 */
export interface EqualOptions extends CompareOptions {
}

/**
 * @inheritDoc
 */
export interface EqualContext extends CompareContext {
}


/**
 * Concrete algorithm for testing the deep equality of two object graphs.
 * @inheritDoc
 */
export class Equal extends Compare implements EqualOptions {
	/**
	 * Construct an equality algorithm
	 */
	public constructor(opts?: EqualOptions) {
		super(opts);
	}

	/**
	 * Test the two object graphs for equality
	 * @returns True if the object graphs are equal, false if not.
	 */
	public equal(lhs: any, rhs: any): boolean {
		let ctx = this.createContext();
		let result = this.compare(
			<GraphNode>{
				value: lhs
			},
			<GraphNode>{
				value: rhs
			},
			ctx
		);
		if (typeof ctx.result !== 'undefined')
			return IS_EQUAL(ctx.result);
		return undefined;
	}

	/**
	 * @inheritDoc
	 * This specialization further initializes the context for a new equality test.
	 * @param args  Does not currently require any arguments.
	 */
	protected createContext(...args: any) {
		let retVal: EqualContext = super.createContext(args);
		return retVal;
	}
}

/**
 * This function is a convenience routine to create a Equal algorithm, and test the specified object graphs for equality.
 * If you are performing many comparisons with the same options, you should probably just new Equal(opts), and invoke @see Equal.equal as many times as needed.
 */
export function deepEqual(lhs: any, rhs: any, opts?: EqualOptions) {
	return (new Equal(opts)).equal(lhs, rhs);
}
