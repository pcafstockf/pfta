import {ownPropertyNames} from './discover';
import {traverse} from './traverse';

describe('traverse', function () {
	it('each', function () {
		let obj = {v: /./i, x: new Date, y: 10, z: 5};
		let counts = <any>{};
		traverse(obj, function (node) {
			let t = (node.value instanceof Date && 'Date') || (node.value instanceof RegExp && 'RegExp') || typeof node.value;
			counts[t] = (counts[t] || 0) + 1;
			return true;
		});
		expect(Object.keys(counts).length).toBe(4);
		expect(counts?.object).toBe(1);
		expect(counts?.Date).toBe(1);
		expect(counts?.RegExp).toBe(1);
		expect(counts?.number).toBe(2);
	});
	it('an Error', function () {
		// Translated from: https://github.com/substack/js-traverse/blob/master/test/error.js
		let obj = new Error('test');
		let results = <any>{};
		traverse(obj, function (node, ctx) {
			if (node.parentNode) {
				results[node.property] = node.value;
			}
			return true;
		}, {objPropsFn: ownPropertyNames});
		expect(results.stack).toBeDefined();
		delete results.stack;
		expect(results).toEqual({message: 'test'});
	});
	it('stop', function () {
		let visits = 0;
		traverse('abcdefghij'.split(''), function (node) {
			if (typeof node.value === 'string') {
				visits++;
				if (node.value === 'e') {
					return node;
				}
			}
			return true;
		});
		expect(visits).toBe(5);
	});
	it('nested+circ', function () {
		let obj = <any>{x: [1, 2, 3], y: [4, 5]};
		obj.y[2] = obj;
		obj.x.push(obj.y);
		let times = 0;
		traverse(obj, function () {
			times += 1;
			return true;
		}, {guardCircularRefs: true});
		expect(times).toBe(8);
	});
	it('es6+circ', function () {
		let obj = {es6: {map: new Map<any,any>(), set: new Set<any>()}, y: 10, z: 5};
		obj.es6.map.set('foo', 'bar');
		obj.es6.map.set(Symbol.for('foo'), 'BAR');
		obj.es6.map.set('obj', obj);
		obj.es6.set.add('baz');
		let counts = <any>{};
		traverse(obj, function (node) {
			counts[node.typeOf] = (counts[node.typeOf] || 0) + 1;
			return true;
		}, {guardCircularRefs: true});
		expect(Object.keys(counts).length).toBe(5);
		expect(counts?.object).toBe(2);
		expect(counts?.string).toBe(3);
		expect(counts?.map).toBe(1);
		expect(counts?.set).toBe(1);
		expect(counts?.number).toBe(2);
	});

	//TODO: Implement this test that ensures things like functions are skipped: https://github.com/substack/js-traverse/blob/master/test/json.js

	//TODO: Implement a test for returning specific Children from the traversal callback
});
