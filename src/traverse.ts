/**
 * This module allows traversal of an object graph, invoking an optional callback function for each node in the graph.
 */
import {GraphNode, Visitor, VisitorContext, VisitorOptions} from './visit';


/**
 * Type definition of a function that the @see TraverseVisitorFnType may return.
 * This function will be called after once before the children of 'node' are visited, and then once again after they have all been visited.
 * The value returned from the first call to this function will be passed as 'firstResult' during the second call to this function.
 */
export type ChildrenCbType = (firstResult?: any) => any;

/**
 * A function that will be invoked for every element in a graph.
 * The required return value from this function determines how the visit will proceed.
 *  Return false to indicate that the visit should NOT recurse.  e.g. children should be ignored and the next sibling node should be visited.
 *      Returning false short circuits traversal logic to discover children, and therefore if your node type could never have children, returning false for those nodes will increase the speed of traversal.
 *  Return true to indicate that the visit should recurse.  e.g. children of the node (IF ANY) should be iterated next.
 *  If the returned value is an array, the elements must be of type GraphNode.  The array explicitly specifies the children (which will be iterated).
 *  If the returned value is a function, it is assumed to be a function of type @see ChildrenDoneFnType.
 *  Any other truthy value will immediately abort visits and cause that value to be returned from the top level traverse call.
 */
export type TraverseVisitorFnType = (value: GraphNode, ctx: TraverseContext) => boolean | GraphNode[] | ChildrenCbType | any;

/**
 * @inheritDoc
 */
export interface TraverseOptions extends VisitorOptions {
}

/**
 * Graph traversal occurs within a context.
 * This structure keeps track of that context.
 */
export interface TraverseContext extends VisitorContext {
	/**
	 * The function to be invoked for each node within the object graph.
	 */
	callback?: TraverseVisitorFnType;
}

/**
 * Concrete algorithm for iterating the nodes of an object graph.
 * @inheritDoc
 */
export class Traverse extends Visitor implements TraverseOptions {
	/**
	 * Construct a traversal algorithm
	 */
	public constructor(opts?: TraverseOptions) {
		super(opts);
	}

	/**
	 * Run this algorithm over the specified object graph 'v', optionally invoking the supplied callback for each node in the graph.
	 * @returns null if the traversal completed, OR the value of the Node at which the callback function aborted the traversal.
	 */
	public traverse(v: any, cb?: TraverseVisitorFnType) {
		let ctx = this.createContext(cb);
		let result = this.visit(<GraphNode>{
			value: v
		}, ctx);
		if (result && typeof result !== 'boolean')
			return result;
		return null;
	}

	/**
	 * @inheritDoc
	 * This specialization further initializes the context for a new traversal with the callback function (if any)
	 * @param args  The first element of args must be a @see TraverseVisitorFnType callback function or undefined.
	 */
	protected createContext(...args: any) {
		let retVal: TraverseContext = super.createContext(args);
		if (args.length > 0 && args[0])
			retVal.callback = args[0];
		return retVal;
	}

	/**
	 * @inheritDoc
	 * This specialization overrides the default visitation and invokes the callback @see TraverseVisitorFnType function (if supplied).
	 */
	protected visitNode(node: GraphNode, ctx: VisitorContext, childVisitorFn?: () => boolean | GraphNode): boolean | GraphNode {
		let result: boolean | GraphNode = true;
		if ((<TraverseContext>ctx).callback) {
			result = (<TraverseContext>ctx).callback(node, <TraverseContext>ctx);
			// Did the callback specify the children itself?  @see TraverseVisitorFnType
			if (Array.isArray(result)) {
				for (let i = 0; i < result.length; i++) {
					let r = this.visit(result[i], ctx);
					if (r && typeof r !== 'boolean')
						return r;
				}
				// We walked the specified children, don't walk this node's children.
				return false;
			}
		}
		let fn: ChildrenCbType;
		let fnResult;
		// Did the callback specify a child wrapper function?  @see TraverseVisitorFnType and @see ChildrenCbType
		if (typeof result === 'function') {
			fn = result;
			result = true;  // Implicit in @see ChildrenCbType is the fact that we walk the Node's children
		}
		// If this Node type has children, and if we are supposed to visit the children, the invoke the child visitor function.
		if (result && typeof result === 'boolean' && childVisitorFn) {
			if (fn)
				fnResult = fn();
			try {
				result = childVisitorFn();
			}
			finally {
				if (fn)
					fn(fnResult);
			}
		}
		return result;
	}
}

/**
 * This function is a convenience routine to create a Traverse algorithm, and traverse the specified object graph.
 * If you are performing many traversals with the same options, you should probably just new Traversal(opts), and invoke @see Traversal.travers as many times as needed.
 */
export function traverse(v: any, cb: TraverseVisitorFnType, opts?: TraverseOptions) {
	return (new Traverse(opts)).traverse(v, cb);
}
