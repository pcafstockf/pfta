/**
 * This module makes a "copy" (aka clone) of an object graph.
 * We say "copy" because whether it is a truly a clone of the previousValue, depends on how this algorithm is configured.
 * By default, this module does it's best to make a true clone of it's input.
 * Just remember that things like object property discovery, and @see BaseCopyFnType determines the ultimate result (similar copy vs clone).
 */
import {ObjPropType} from './discover';
import {GraphNode, Visitor, VisitorContext, VisitorOptions} from './visit';


/**
 * Type definition for functions which create a "base" instance of an object.
 * For immutable objects such as String, Number, Boolean, etc., you would typically just return that same object.
 * For iterables like Array, Map, Set, you should return a *new* instance of the same, *but* without copying over any of the elements.
 * For common known *mutable* classes like RegExpr and Data, you would typically create a new instance using it's copy constructor.
 */
export type BaseCopyFnType = (node: GraphNode) => any;

/**
 * Caller defined options for cloning an object graph.
 */
export interface CopyOptions extends VisitorOptions {
	/**
	 * Extension point allowing you to create your own application specific, value instantiation logic.
	 * Hopefully you won't need this.  If you do, please contact the maintainer(s) as this may indicate an un-anticipated usage scenario.
	 * Default value is @see defaultCreateCopy
	 */
	createCopyFn?: BaseCopyFnType;
}

/**
 * Deep cloning takes place within a context.
 * This structure keeps track of that context.
 */
export interface CopyContext extends VisitorContext {
	/**
	 * If @see TraverseOptions.guardCircularRefs is true, this is initialized to an empty array before the start of each cloning operation.
	 * It is used to ensure that circular refs in the copy match circular refs in the previousValue.
	 */
	refMirrors?: any[];
}

/**
 * It's okay to declare our overridden methods as taking a specialized GraphNode, because since both are interfaces and that doesn't translate to JavaScript anyway.
 */
export interface CopyNode<T = any> extends GraphNode {
	mirror?: T;
	addChildFn?: (parent: CopyNode, child: CopyNode) => void;
}

/**
 * Default implementation of @see BaseCopyFnType.
 */
export function defaultCreateCopy(node: GraphNode): any {
	let o = node.value;
	//TODO: Is it safe to assume anything not of type 'object' is immutable?
	if (o === null || typeof o !== 'object')
		return o;
	// Handle some special 'object' types.
	if (Array.isArray(o))
		return new Array(o.length);
	if (o instanceof Date)
		return new Date(o);
	if (o instanceof Map)
		return new Map();
	if (o instanceof Set)
		return new Set();
	if (o instanceof RegExp)
		return new RegExp(o);
	if (ArrayBuffer.isView(o))
		return (<any>o).slice();
	if (o instanceof ArrayBuffer)
		return o.slice(0);

	// Not an instance of something we recognize, so things get fuzzy...
	/*
	 The sad truth is, there is no way to perfectly clone an object in Javascript.
	 Here is a description of the approach we take.
	 If you don't fully understand this comment block, please take the time to write test code and step through a debugger until you can fully explain the difference between the 6 approaches mentioned.
	 Note that all of these create something completely different from each other.
	      1.) r = Object.create(o).
	      2.) r = Object.assign({}, o)  OR  r = {...o} (both of these result in the same thing).
	      3.) The "for..in" pattern with hasOwnProperty filter (can yield same as #2 depending on how you implemented your pattern).
	      4.) The "for..in" pattern *without* hasOwnProperty filter (see the discussion of #1 below for insight).
	      5.) r = Object.assign(Object.create(Object.getPrototypeOf(o)), o);
	  #2 is the most commonly found solution on the internet (in 2019).
	  #3 used to be the most popular, but omits Symbols, so #2 is the popular es2015 alternative
	  #1 is often advocated (or any approach that includes #1) , but thar be dragons...
	      Say o.p == 12, then you invoke #5, and then you invoke r.p = 5;  Now invoke "delete r.p;".  r.p will *still* be defined but will be 12.  Worse, if you set o.p = 7;, r.p will *also* be 7.  Welcome to JavaScript!
	  #4 has dragons similar to #1
	  #5 is our chosen approach because it gives us an object of the same *class* (in TypeScript parlance).  e.g. has the same prototype.
	    It is worth noting that this does *not* call what Typescript would call the class constructor (which might be appropriate in some cases but might not in others).
	    Also note that since we are deep cloning, we just use Object.create(Object.getPrototypeOf(o)), and then individually assign each "own" property via visitation, cloning as we go.
	*/

	// Create an object with an *identical* prototype to the source object, but without any of it's "own" properties (this is the documented contract for this function).
	return Object.create(Object.getPrototypeOf(o));
}

/**
 * Concrete algorithm for copying the nodes of an object graph.
 * @inheritDoc
 */
export class Copy extends Visitor implements CopyOptions {
	/**
	 * Construct a cloning algorithm
	 */
	public constructor(opts?: CopyOptions) {
		super(opts);
		if (opts?.createCopyFn)
			this.createCopyFn = opts.createCopyFn;
		else
			this.createCopyFn = defaultCreateCopy;
	}
	/**
	 * @inheritDoc
	 */
	public readonly createCopyFn?: BaseCopyFnType;

	/**
	 * Make a copy of the specified object graph.
	 */
	public copy(v: any) {
		let ctx = this.createContext();
		let src = <CopyNode>{
			value: v
		};
		let result = this.visit(src, ctx);
		if (typeof result === 'boolean')
			return src.mirror;
		return undefined;
	}

	/**
	 * @inheritDoc
	 * This specialization further initializes the context for a new copy operation.
	 */
	protected createContext(...args: any) {
		let retVal: CopyContext = super.createContext(args);
		if (this.guardCircularRefs) {
			retVal.refMirrors = [];
		}
		return retVal;
	}


	/**
	 * @inheritDoc
	 * This specialization creates a copy (aka mirror) for every value in the object graph.
	 */
	protected visitNode(node: CopyNode, ctx: VisitorContext, childVisitorFn?: () => boolean | GraphNode): boolean | GraphNode {
		try {
			if (this.guardCircularRefs) {
				let idx = this.indexOfReference(ctx, node);
				// If it isn't a known reference, then just proceed as normal
				if (idx >= 0) {
					// Did we already make a mirror of this CopyNode?
					if (idx < (<CopyContext>ctx).refMirrors.length) {
						node.mirror = (<CopyContext>ctx).refMirrors[idx];
						return false;   // Don't visit the children.  BUT, this mirror still needs added to it's parent mirror (in the finally block below).
					}
					else {
						node.mirror = this.createCopyFn(node);
						// Nice thing about JavaScript, arrays will auto adjust their length.
						(<CopyContext>ctx).refMirrors[idx] = node.mirror;
					}
				}
				else // isn't a known reference
					node.mirror = this.createCopyFn(node);
			}
			else // not trying to guard anything.
				node.mirror = this.createCopyFn(node);

			if (childVisitorFn)
				return childVisitorFn();
		}
		finally {
			if (node.addChildFn)
				node.addChildFn(<CopyNode>node.parentNode, node);
		}
		return true;
	}

	/**
	 * @inheritDoc
	 * Specialization that sets an appropriate CopyNode.addChildFn for object properties.
	 */
	protected createObjectPropertyNode(value: any, property: ObjPropType, obj: CopyNode<object>, position: number, ctx: VisitorContext) {
		let retVal = <CopyNode>super.createObjectPropertyNode(value, property, obj, position, ctx);
		retVal.addChildFn = Copy.AddObjectProperty;
		return retVal;
	}
	protected static AddObjectProperty(parent: CopyNode<object>, child: CopyNode) {
		parent.mirror[child.property] = child.mirror;
	}

	/**
	 * @inheritDoc
	 * Specialization that sets an appropriate CopyNode.addChildFn for ES6 Map entries.
	 */
	protected createMapElementNode(value: any, key: any, map: CopyNode<Map<any, any>>, position: number, ctx: VisitorContext) {
		let retVal = <CopyNode>super.createMapElementNode(value, key, map, position, ctx);
		retVal.addChildFn = Copy.AddMapElement;
		return retVal;
	}
	protected static AddMapElement(parent: CopyNode<Map<any, any>>, child: CopyNode) {
		parent.mirror.set(child.property, child.mirror);
	}

	/**
	 * @inheritDoc
	 * Specialization that sets an appropriate CopyNode.addChildFn for ES6 Set elements.
	 */
	protected createSetElementNode(value: any, set: CopyNode<Set<any>>, position: number, ctx: VisitorContext) {
		let retVal = <CopyNode>super.createSetElementNode(value, set, position, ctx);
		retVal.addChildFn = Copy.AddSetElement;
		return retVal;
	}
	protected static AddSetElement(parent: CopyNode<Set<any>>, child: CopyNode) {
		parent.mirror.add(child.mirror);
	}

	/**
	 * @inheritDoc
	 * Specialization that sets an appropriate CopyNode.addChildFn for Array elements.
	 */
	protected createArrayElementNode(currentValue: any, index: number, array: CopyNode<Array<any>>, position: number, ctx: VisitorContext): GraphNode {
		let retVal = <CopyNode>super.createArrayElementNode(currentValue, index, array, position, ctx);
		retVal.addChildFn = Copy.AddArrayElement;
		return retVal;
	}
	protected static AddArrayElement(parent: CopyNode<Array<any>>, child: CopyNode) {
		parent.mirror[child.property] = child.mirror;
	}
}

/**
 * This function is a convenience routine to create a Copy algorithm, and return a copy of the specified value.
 * If you are performing many copy operations with the same options, you should probably just new Copy(opts), and invoke @see Copy.copy as many times as needed.
 */
export function deepCopy(v: any, opts?: CopyOptions) {
	return (new Copy(opts)).copy(v);
}
