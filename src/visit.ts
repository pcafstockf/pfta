/**
 * This module implements the *base* algorithm for visiting nodes of an object graph.
 * Specifically you can customize the discovery of nodes in the graph by configuring visits using functions form the 'discover' module.
 * If you simply want to traverse a graph, see the concrete @see Traverse implementation.
 */
import {ObjPropsFnType, ObjPropType, ownEnumerableNames, PropertyFilterFnType} from './discover';

/**
 * This is what is actually passed around the visitation algorithm, one for every value in an object graph.
 * A GraphNode contains the value itself as well as meta information about the value.
 */
export interface GraphNode<V = any> {
	/**
	 * The value this GraphNode is describing.
	 */
	value: V;
	/**
	 * The value returned by the JavaScript "typeof" operation, but enhanced for "object" types to return things like date, array, set, null, view, buffer, etc.
	 */
	typeOf?: string;
	/**
	 * Don't get confused here... This is the property within *parent* which refers to this Nodes 'value'.
	 */
	property?: ObjPropType;
	/**
	 * If typeOf is (or would be) 'object', this will be @see ObjPropsFnType() -> @see PropertyFilterFnType.
	 */
	properties?: ObjPropType[];
	/**
	 * Describes the ordering of this GraphNode within it's parent (useful for ES6 Set, ES6 Map, and perhaps even Object).
	 * For Array elements, it will be the same as 'property'.
	 */
	position?: number;
	/**
	 * The parent/owner of this GraphNode (if any).
	 */
	parentNode?: GraphNode;
}

/**
 * Options controlling the visitation algorithm.
 */
export interface VisitorOptions {
	/**
	 * Determines what properties of an object will be visited.
	 * Default value is @see ownEnumerableNames
	 */
	objPropsFn?: ObjPropsFnType;
	/**
	 * If defined, values returned from @see ObjPropsFnType will be passed through this filter.
	 */
	propFilter?: PropertyFilterFnType;
	/**
	 * Enables support for circular references in the object graph.
	 * This is both a memory and time consuming, option.
	 * Default value is false.
	 */
	guardCircularRefs?: boolean;
}

/**
 * Maintains internal state for a specific visit.
 */
export interface VisitorContext {
	/**
	 * Keeps track of visited values in the object graph.
	 * Only defined if @see VisitorOptions.guardCircularRefs is true.
	 */
	refs?: any[];
}

/**
 * Default (baase) visitation algorithm for the entire package.
 */
export class Visitor implements VisitorOptions {
	/**
	 * Initialize the construction algorithm.
	 */
	protected constructor(opts?: VisitorOptions) {
		this.guardCircularRefs = !!opts?.guardCircularRefs;
		this.objPropsFn = opts?.objPropsFn || ownEnumerableNames;
		if (opts?.propFilter)
			this.propFilter = opts.propFilter;
	}
	/**
	 * @inheritDoc
	 */
	public readonly objPropsFn?: ObjPropsFnType;
	/**
	 * @inheritDoc
	 */
	public readonly propFilter?: PropertyFilterFnType;
	/**
	 * @inheritDoc
	 */
	public readonly guardCircularRefs: boolean;

	/**
	 * Create the context for a specific visitation operation.
	 * @param args  Base class options on the left, and subclass options to the right of those.
	 */
	protected createContext(...args: any) {
		let retVal = <VisitorContext>{};
		if (this.guardCircularRefs) {
			retVal.refs = [];
		}
		return retVal;
	}

	/**
	 * Updates the @see GraphNode.typeOf value.
	 * This returns the string given by the JavaScript typeof operator, but if the result is 'object', it will be enhanced to one of the following (as strings):
	 *  map, set, date, array, null, regex, view, buffer.
	 * If you wish to support additional types you can override this routine, but you will likely need to also override other routines such as @see Visitor.visit
	 */
	protected updateNodeTypeOf(node: GraphNode) {
		let obj = node.value;
		if (obj === null) {
			node.typeOf = 'null';
		}
		else {
			node.typeOf = typeof obj;
			if (node.typeOf === 'object') {
				if (Array.isArray(obj)) {
					node.typeOf = 'array';
				}
				else if (obj instanceof Date) {
					node.typeOf = 'date';
				}
				else if (obj instanceof Map) {
					node.typeOf = 'map';
				}
				else if (obj instanceof Set) {
					node.typeOf = 'set';
				}
				else if (obj instanceof RegExp) {
					node.typeOf = 'regex';
				}
				else if (ArrayBuffer.isView(obj)) {
					node.typeOf = 'view';
				}
				else if (obj instanceof ArrayBuffer)
					node.typeOf = 'buffer';
			}
		}
	}

	/**
	 * All Nodes to be visited come through this choke point.
	 * This method does a little housekeeping, determines the type of the GraphNode and calls a more specialized method to handle that GraphNode type.
	 * If you have specialized types of Nodes, you may want to override this method.
	 * You should *not* override this method if you just want to process the standard GraphNode types, instead @see Visitor.visitNode.
	 */
	protected visit(node: GraphNode, ctx: VisitorContext): boolean | GraphNode {
		// guard against circular references
		if (this.hasReference(ctx, node)) {
			return false;
		}
		// Ensure we know the type of the node.
		if (!node.typeOf) {
			this.updateNodeTypeOf(node);
		}
		// dispatch to a more specialized handler method.
		switch (node.typeOf) {
			case 'array':
				if (this.guardCircularRefs) {
					this.addReference(ctx, node);
				}
				return this.visitArray(node, ctx);
			case 'set':
				if (this.guardCircularRefs) {
					this.addReference(ctx, node);
				}
				return this.visitSet(node, ctx);
			case 'map':
				if (this.guardCircularRefs) {
					this.addReference(ctx, node);
				}
				return this.visitMap(node, ctx);
			case 'object':
				if (this.guardCircularRefs) {
					this.addReference(ctx, node);
				}
				return this.visitObject(node, ctx);
			default:
				return this.visitOther(node, ctx);
		}
	}

	/**
	 * Visit anything that is not an array, set, map, or object.
	 */
	protected visitOther(node: GraphNode, ctx: VisitorContext): boolean | GraphNode {
		return this.visitNode(node, ctx);
	}

	/**
	 * Visit an object, and it's properties, where the properties are discovered by @see VisitorOptions.objPropsFn
	 */
	protected visitObject(node: GraphNode<object>, ctx: VisitorContext): boolean | GraphNode {
		return this.visitNode(node, ctx, () => {
			if (!node.properties) {
				this.updateObjectNodeProperties(node);
			}
			for (let i = 0; i < node.properties.length; i++) {
				let prop = node.properties[i];
				let r = this.visit(this.createObjectPropertyNode(node.value[prop], prop, node, i, ctx), ctx);
				if (r && typeof r !== 'boolean') {
					return r;
				}
			}
			return true;
		});
	}
	/**
	 * Update an GraphNode<object>'s properties using whatever property name/key function has been configured for this algorithm.
	 * If a property filter function was defined for this algorithm, ensure it is also applied.
	 */
	protected updateObjectNodeProperties(node: GraphNode<object>) {
		node.properties = this.objPropsFn(node.value);
		if (this.propFilter) {
			node.properties = node.properties.filter(p => this.propFilter(node, p));
		}
	}
	/**
	 * Create a GraphNode describing the specified object property and value
	 */
	protected createObjectPropertyNode(value: any, property: ObjPropType, obj: GraphNode<object>, position: number, ctx: VisitorContext) {
		return <GraphNode>{
			value: value,
			position: position,
			property: property,
			parentNode: obj
		};
	}

	/**
	 * Visit an ES6 Map and it's child entries
	 */
	protected visitMap(node: GraphNode<Map<any, any>>, ctx: VisitorContext): boolean | GraphNode {
		return this.visitNode(node, ctx, () => {
			let i = 0;
			for (let pair of node.value) {
				let r = this.visit(this.createMapElementNode(pair[1], pair[0], node, i, ctx), ctx);
				if (r && typeof r !== 'boolean') {
					return r;
				}
				i += 1;
			}
			return true;
		});
	}
	/**
	 * Create a GraphNode describing the specified Map entry
	 */
	protected createMapElementNode(value: any, key: any, map: GraphNode<Map<any, any>>, position: number, ctx: VisitorContext) {
		return <GraphNode>{
			value: value,
			position: position,
			property: key,
			parentNode: map
		};
	}

	/**
	 * Visit an ES6 Set and it's child elements.
	 */
	protected visitSet(node: GraphNode<Set<any>>, ctx: VisitorContext): boolean | GraphNode {
		return this.visitNode(node, ctx, () => {
			let i = 0;
			for (let elem of node.value) {
				let r = this.visit(this.createSetElementNode(elem, node, i, ctx), ctx);
				if (r && typeof r !== 'boolean') {
					return r;
				}
				i += 1;
			}
			return true;
		});
	}
	/**
	 * Create a GraphNode describing the specified Set element.
	 */
	protected createSetElementNode(value: any, set: GraphNode<Set<any>>, position: number, ctx: VisitorContext) {
		return <GraphNode>{
			value: value,
			position: position,
			parentNode: set
		};
	}

	/**
	 * Visit an Array and its child elements
	 */
	protected visitArray(node: GraphNode<Array<any>>, ctx: VisitorContext): boolean | GraphNode {
		return this.visitNode(node, ctx, () => {
			let l = node.value.length;
			for (let i = 0; i < l; i++) {
				let r = this.visit(this.createArrayElementNode(node.value[i], i, node, i, ctx), ctx);
				if (r && typeof r !== 'boolean') {
					return r;
				}
			}
			return true;
		});
	}
	/**
	 * Create a GraphNode describing the specified Array element
	 */
	protected createArrayElementNode(currentValue: any, index: number, array: GraphNode<Array<any>>, position: number, ctx: VisitorContext) {
		return <GraphNode>{
			value: currentValue,
			position: position,
			property: index,
			parentNode: array
		};
	}

	/**
	 * Ultimately every GraphNode visited ends up here (unless subclasses modify the flow of course).
	 * This method simply recurses down to iterate the children (if any).
	 * If you want to perform operations on each visited GraphNode, override this method.
	 *
	 * @param node  The node being visited.
	 * @param ctx   Contextual information about the in process visitation operation.
	 * @param childVisitorFn  If defined, this callback will trigger visitation of the children of 'node'.
	 */
	protected visitNode(node: GraphNode, ctx: VisitorContext, childVisitorFn?: () => boolean | GraphNode): boolean | GraphNode {
		if (childVisitorFn)
			return childVisitorFn();
		return true;
	}

	/**
	 * Returns true if the *value* represented by the specified GraphNode has already been visited by the current visitation operation.
	 */
	protected hasReference(ctx: VisitorContext, node: GraphNode) {
		return this.indexOfReference(ctx, node) >= 0;
	}
	/**
	 * Returns the index of a Reference within the cache (if it is in the cache).
	 */
	protected indexOfReference(ctx: VisitorContext, node: GraphNode): number {
		if (ctx.refs && node.value)
			return ctx.refs.findIndex(e => Object.is(e, node.value));
		return -1;
	}
	/**
	 * Keep track of Nodes that have been visited in order to guard against circular object graphs.
	 * If @see VisitorOptions.guardCircularRefs is true, each new GraphNode discovered will be passed to this method.
	 */
	protected addReference(ctx: VisitorContext, node: GraphNode) {
		if (ctx.refs && node.value)
			ctx.refs.push(node.value);
	}
}
