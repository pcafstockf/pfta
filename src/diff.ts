/**
 * This module analyzes two object graphs and generates a list of Changes that if applied will morph the left hand side object graph to be equal to the right hand side object graph.
 */
import {Compare, CompareContext, CompareOptions, NOT_EQUAL} from './compare';
import {Copy, CopyOptions} from './copy';
import {AddToLhs, Change, EditLhs, PathSegment, RemoveFromLhs} from './patch';
import {stringHashCode} from './util';
import {GraphNode} from './visit';

/**
 * Options for differencing two object graphs.
 */
export interface DiffOptions extends CompareOptions {
	/**
	 * If defined, these options will be used to copy (aka clone) the values from the rhs that are to be Add or Edit to the lhs.
	 * NOTE: This will slow down Change generation, but does ensure that subsequent changes to the rhs will not affect patching.
	 * The default is undefined which means you must not modify the rhs until you have completed/discarded the generated Changes.
	 */
	rhsCopyOpts?: CopyOptions;
}

/**
 * Checking for differences requires contextual state.
 * This structure keeps track of that context.
 */
export interface DiffContext extends CompareContext {
	/**
	 * Accumulates the discovered differences as the operation proceeds.
	 */
	changes: Change[];
}

/**
 * Concrete algorithm for generating a list of differences between two object graphs.
 * @inheritDoc
 */
export class Diff extends Compare implements DiffOptions {
	/**
	 * Construct a differencing algorithm
	 */
	public constructor(opts?: DiffOptions) {
		super(opts);
		if (opts?.rhsCopyOpts)
			this.copyAlgorithm = new Copy(opts?.rhsCopyOpts);
	}
	/**
	 * If @see DiffOptions.rhsCopyOpts were provided, this will be a new Copy algorithm created from those options.
	 */
	protected readonly copyAlgorithm?: Copy;

	/**
	 * Generate a list of @see Changes needed to morph the lhs object graph to be equal to the rhs object graph.
	 * @returns an empty array if the lhs is already equal to the rhs.
	 */
	public diff(lhs: any, rhs: any): Change[] {
		let ctx = this.createContext();
		this.compare(
			{
				value: lhs
			}, {
				value: rhs
			},
			ctx
		);
		return ctx.changes;
	}

	/**
	 * @inheritDoc
	 * This specialization further initializes the context for a new differencing operation.
	 */
	protected createContext(...args: any) {
		let retVal = <DiffContext>super.createContext(args);
		retVal.changes = [];
		return retVal;
	}

	/**
	 * @inheritDoc
	 * This specialization records the difference, *and* signals that visitation should continue.
	 */
	protected notEqual(ctx: DiffContext, lhs: GraphNode, rhs: GraphNode, cmp: boolean | number): boolean | GraphNode {
		if (ctx.searching) {
			ctx.searchResult = cmp;
		}
		else {
			ctx.changes.push(this.createEdit(lhs, rhs, ctx));
			ctx.result = cmp;
		}
		return true;    // Keep visiting
	}

	/**
	 * @inheritDoc
	 * This specialization records the lhs absence, *and* signals that visitation should continue.
	 */
	protected noLhs(ctx: DiffContext, rhs: GraphNode): boolean | GraphNode {
		if (ctx.searching) {
			ctx.searchResult = NOT_EQUAL;
		}
		else {
			ctx.changes.push(this.createAdd(rhs, ctx));
			ctx.result = NOT_EQUAL;
		}
		return true;    // Keep visiting
	}

	/**
	 * @inheritDoc
	 * This specialization records the rhs absence, *and* signals that visitation should continue.
	 */
	protected noRhs(ctx: DiffContext, lhs: GraphNode): boolean | GraphNode {
		if (ctx.searching) {
			ctx.searchResult = NOT_EQUAL;
		}
		else {
			ctx.changes.push(this.createRemove(lhs, ctx));
			ctx.result = NOT_EQUAL;
		}
		return true;    // Keep visiting
	}

	// noinspection JSUnusedLocalSymbols
	/**
	 * Create a Change operation to remove from the left hand side.
	 */
	protected createRemove(lhs: GraphNode, ctx: DiffContext): Change {
		return new RemoveFromLhs(this.makePath(lhs));
	}
	// noinspection JSUnusedLocalSymbols
	/**
	 * Create a Change operation to add to the left hand side (making a copy of the rhs if that was requested).
	 */
	protected createAdd(rhs: GraphNode, ctx: DiffContext): Change {
		let path = this.makePath(rhs);
		// Any time a diff operation needs to 'add' something to a lhs array, it needs to do an "insert" as opposed to assign.
		// A negative segment value is a Magic signal to the patch code (@see AddToLhs.apply) to splice instead of set.
		if (path[path.length-1].typeOf === 'array')
			path[path.length-1].segment = -<number>path[path.length-1].segment - 1;
		return new AddToLhs(path, this.copyAlgorithm ? this.copyAlgorithm.copy(rhs.value) : rhs.value);
	}
	// noinspection JSUnusedLocalSymbols
	/**
	 * Create a Change operation to edit (e.g. modify) the left hand side (making a copy of the rhs if that was requested).
	 */
	protected createEdit(lhs: GraphNode, rhs: GraphNode, ctx: DiffContext) {
		return new EditLhs(this.makePath(rhs), this.copyAlgorithm ? this.copyAlgorithm.copy(rhs.value) : rhs.value);
	}

	/**
	 * Create a path root->node of @see PathSegment structures.
	 */
	protected makePath(node: GraphNode): PathSegment[] {
		let retVal: PathSegment[] = [];
		while (node.parentNode) {
			let t = node.parentNode.typeOf;
			let s = node.property;
			if (t === 'set') {
				if (this.strictSetOrdering && typeof node.position !== 'undefined')
					s = node.position;
				else
					s = '' + stringHashCode(JSON.stringify(node.value));
			}
			retVal.unshift({
				typeOf: t,
				segment: s
			});
			node = node.parentNode;
		}
		return retVal;
	}
}

/**
 * This function is a convenience routine to create a Diff algorithm to analyze two object graphs and return a list of Change operations required morph the lhs to be equal to the rhs.
 * If you are performing many diff operations with the same options, you should probably just new Diff(opts), and invoke @see Diff.diff as many times as needed.
 */
export function deepDiff(lhs: any, rhs: any, opts?: DiffOptions): Change[] {
	return (new Diff(opts)).diff(lhs, rhs);
}
