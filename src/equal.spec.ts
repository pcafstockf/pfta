import {deepEqual, Equal} from './equal';

//TODO: This whole suite needs implemented here:  https://github.com/substack/js-traverse/blob/master/test/equal.js

describe('equal', function () {
	// This test translated from:  https://github.com/substack/js-traverse/blob/master/test/super_deep.js
	function make() {
		let a = <any>{self: 'a'};
		let b = <any>{self: 'b'};
		let c = <any>{self: 'c'};
		let d = <any>{self: 'd'};
		let e = <any>{self: 'e'};

		a.a = a;
		a.b = b;
		a.c = c;

		b.a = a;
		b.b = b;
		b.c = c;

		c.a = a;
		c.b = b;
		c.c = c;
		c.d = d;

		d.a = a;
		d.b = b;
		d.c = c;
		d.d = d;
		d.e = e;

		e.a = a;
		e.b = b;
		e.c = c;
		e.d = d;
		e.e = e;

		return <any>a;
	}

	it('are', function () {
		let a0 = make();
		let a1 = make();

		expect(deepEqual(a0, a1, {guardCircularRefs: true})).toBeTruthy();
	});
	it('are-not-multi', function () {
		let algo = new Equal({guardCircularRefs: true});
		let a0 = make();
		let a1 = make();

		a0.c.d.moo = true;
		expect(algo.equal(a0, a1)).toBeFalsy();

		a1.c.d.moo = true;
		expect(algo.equal(a0, a1)).toBeTruthy();
	});
});
