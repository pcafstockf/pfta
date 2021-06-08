// noinspection TypeScriptPreferShortImport

import {deepDiff} from './diff';
import {AddToLhs, EditLhs, RemoveFromLhs, UnDoWithPrev} from './patch';

let empty = {};
describe('A target that has no properties', function () {

	it('shows no differences when compared to another empty object', function () {
		let d = deepDiff(empty, {});
		expect(d?.length).toBe(0);
	});

	describe('when compared to a different type of keyless object', function () {
		let comparandTuples = [
			['an array', {key: []}],
			['an object', {key: {}}],
			['a date', {key: new Date()}],
			['a buffer', {key: new ArrayBuffer(5)}],
			['a view', {key: new Float32Array(3)}],
			['a null', {key: null}],
			['a regexp literal', {key: /a/}]
		];
		comparandTuples.forEach(function (lhsTuple) {
			comparandTuples.forEach(function (rhsTuple) {
				if (lhsTuple[0] === rhsTuple[0]) {
					return;
				}
				it('shows differences when comparing ' + lhsTuple[0] + ' to ' + rhsTuple[0], function () {
					let d = deepDiff(lhsTuple[1], rhsTuple[1]);
					expect(d).toBeDefined();
					expect(d.length).toBe(1);
					expect(d[0]).toBeInstanceOf(EditLhs);
				});
			});
		});
	});

	describe('when compared with an object having other properties', function () {
		let comparand = {
			other: 'property',
			another: 13.13
		};
		let d = deepDiff(empty, comparand);

		it('the differences are reported', function () {
			expect(d).toBeDefined();
			expect(d.length).toBe(2);

			expect(d[0]).toBeInstanceOf(AddToLhs);
			expect(Array.isArray(d[0].path)).toBeTruthy();
			expect(d[0].path[0].segment).toEqual('other');
			expect((<AddToLhs>d[0]).value).toEqual('property');

			expect(d[1]).toBeInstanceOf(AddToLhs);
			expect(Array.isArray(d[1].path)).toBeTruthy();
			expect(d[1].path[0].segment).toEqual('another');
			expect((<AddToLhs>d[1]).value).toEqual(13.13);
		});
	});
});

describe('A target that has one property', function () {
	let lhs = {
		one: 'property'
	};

	it('shows no differences when compared to itself', function () {
		let d = deepDiff(lhs, lhs);
		expect(d?.length).toBe(0);
	});

	it('shows the property as removed when compared to an empty object', function () {
		let d = deepDiff(lhs, empty);
		expect(d).toBeDefined();
		expect(d.length).toBe(1);
		expect(d[0]).toBeInstanceOf(RemoveFromLhs);
	});

	it('shows the property as edited when compared to an object with null', function () {
		let d = deepDiff(lhs, {
			one: null
		});
		expect(d).toBeDefined();
		expect(d.length).toBe(1);
		expect(d[0]).toBeInstanceOf(EditLhs);
	});

	it('shows the property as edited when compared to an array', function () {
		let d = deepDiff(lhs, ['one']);
		expect(d).toBeDefined();
		expect(d.length).toBe(1);
		expect(d[0]).toBeInstanceOf(EditLhs);
	});
});

describe('A target that has null value', function () {
	let lhs = {
		key: null
	};

	it('shows no differences when compared to itself', function () {
		let d = deepDiff(lhs, lhs);
		expect(d?.length).toBe(0);
	});

	it('shows the property as removed when compared to an empty object', function () {
		let d = deepDiff(lhs, empty);
		expect(d).toBeDefined();
		expect(d.length).toBe(1);
		expect(d[0]).toBeInstanceOf(RemoveFromLhs);
	});

	it('shows the property is changed when compared to an object that has value', function () {
		let d = deepDiff(lhs, {
			key: 'value'
		});
		expect(d).toBeDefined();
		expect(d.length).toBe(1);
		expect(d[0]).toBeInstanceOf(EditLhs);
	});

	it('shows that an object property is changed when it is set to null', function () {
		lhs.key = {
			nested: 'value'
		};
		let d = deepDiff(lhs, {
			key: null
		});
		expect(d).toBeDefined();
		expect(d.length).toBe(1);
		expect(d[0]).toBeInstanceOf(EditLhs);
	});

});

describe('A target that has a date value', function () {
	let lhs = {
		key: new Date(555555555555)
	};

	it('shows the property is changed with a new date value', function () {
		let d = deepDiff(lhs, {
			key: new Date(777777777777)
		});
		expect(d).toBeDefined();
		expect(d.length).toBe(1);
		expect(d[0]).toBeInstanceOf(EditLhs);
	});

});

describe('A target that has a buffer value', function () {
	let lhs = {
		key: new ArrayBuffer(4)
	};
	let tmp = new DataView(lhs.key);
	tmp.setInt8(1, 3);

	it('shows the property is changed with a new buffer value', function () {
		let d = deepDiff(lhs, {
			key: new ArrayBuffer(4)
		});
		expect(d).toBeDefined();
		expect(d.length).toBe(1);
		expect(d[0]).toBeInstanceOf(EditLhs);
	});
});

describe('A target that has a view value', function () {
	let lhs = {
		key: new DataView(new ArrayBuffer(4))
	};
	lhs.key.setInt8(2, 3);

	it('shows the property is changed with a new view value', function () {
		let d = deepDiff(lhs, {
			key: new DataView(new ArrayBuffer(4))
		});
		expect(d).toBeDefined();
		expect(d.length).toBe(1);
		expect(d[0]).toBeInstanceOf(EditLhs);
	});
});

describe('A target that has a NaN', function () {
	let lhs = {
		key: NaN
	};

	it('shows the property is changed when compared to another number', function () {
		let d = deepDiff(lhs, {
			key: 0
		});
		expect(d).toBeDefined();
		expect(d.length).toBe(1);
		expect(d[0]).toBeInstanceOf(EditLhs);
	});

	it('shows no differences when compared to another NaN', function () {
		let d = deepDiff(lhs, {
			key: NaN
		});
		expect(d?.length).toBe(0);
	});

});

describe('When filtering keys', function () {
	let lhs = {
		enhancement: 'Filter/Ignore Keys?',
		numero: 11,
		submittedBy: 'ericclemmons',
		supportedBy: ['ericclemmons'],
		status: 'open'
	};
	let rhs = {
		enhancement: 'Filter/Ignore Keys?',
		numero: 11,
		submittedBy: 'ericclemmons',
		supportedBy: [
			'ericclemmons',
			'TylerGarlick',
			'flitbit',
			'ergdev'
		],
		status: 'closed',
		fixedBy: 'flitbit'
	};

	describe('if the filtered property is an array', function () {

		it('changes to the array do not appear as a difference', function () {
			let d = deepDiff(lhs, rhs, {
				propFilter: function (path, key) {
					return key !== 'supportedBy';
				}
			});
			expect(d).toBeDefined();
			expect(d.length).toBe(2);
			expect(d[0]).toBeInstanceOf(AddToLhs);
			expect(d[1]).toBeInstanceOf(EditLhs);
		});
	});

	describe('if the filtered property is not an array', function () {

		it('changes do not appear as a difference', function () {
			let d = deepDiff(lhs, rhs, {
				propFilter: function (path, key) {
					return key !== 'fixedBy';
				}
			});
			expect(d).toBeDefined();
			expect(d.length).toBe(4);
			expect(d[0]).toBeInstanceOf(AddToLhs);
			expect(d[1]).toBeInstanceOf(AddToLhs);
			expect(d[2]).toBeInstanceOf(AddToLhs);
			expect(d[3]).toBeInstanceOf(EditLhs);
		});
	});
});


describe('A target that has nested values', function () {
	let nestedOne = {
		noChange: 'same',
		levelOne: {
			levelTwo: 'value'
		},
		arrayOne: [{
			objValue: 'value'
		}]
	};
	let nestedTwo = {
		noChange: 'same',
		levelOne: {
			levelTwo: 'another value'
		},
		arrayOne: [{
			objValue: 'new value'
		}, {
			objValue: 'more value'
		}]
	};

	it('shows no differences when compared to itself', function () {
		let d = deepDiff(nestedOne, nestedOne);
		expect(d?.length).toBe(0);
	});

	it('shows the property as removed when compared to an empty object', function () {
		let d = deepDiff(nestedOne, empty);
		expect(d).toBeDefined();
		expect(d.length).toBe(3);
		expect(d[0]).toBeInstanceOf(RemoveFromLhs);
		expect(d[1]).toBeInstanceOf(RemoveFromLhs);
	});

	it('shows the property is changed when compared to an object that has value', function () {
		let d = deepDiff(nestedOne, nestedTwo);
		expect(d).toBeDefined();
		expect(d.length).toBe(3);
	});

	it('shows the property as added when compared to an empty object on left', function () {
		let d = deepDiff(empty, nestedOne);
		expect(d).toBeDefined();
		expect(d.length).toBe(3);
		expect(d[0]).toBeInstanceOf(AddToLhs);
	});

	describe('when deepDiff is applied to a different empty object', function () {
		let d = deepDiff(nestedOne, nestedTwo);

		it('has result with nested values', function () {
			let result = <any>{};
			expect(d.length).toBe(3);
			d.forEach(c => c.apply(result, true));
			expect(typeof result.levelOne).toEqual('object');
			expect(result.levelOne.levelTwo).toBeDefined();
			expect(result.levelOne.levelTwo).toEqual('another value');
		});

		it('has result with array object values', function () {
			let result = <any>{};
			expect(d.length).toBe(3);
			d.forEach(c => c.apply(result, true));
			expect(Array.isArray(result.arrayOne)).toBeTruthy();
			expect(result.arrayOne[0]).toBeDefined();
			expect(result.arrayOne[0].objValue).toBeDefined();
			expect(result.arrayOne[0].objValue).toEqual('new value');
		});

		it('has result with added array objects', function () {
			let result = <any>{};
			expect(d.length).toBe(3);
			d.forEach(c => c.apply(result, true));
			expect(Array.isArray(result.arrayOne)).toBeTruthy();
			expect(result.arrayOne[1]).toBeDefined();
			expect(result.arrayOne[1].objValue).toBeDefined();
			expect(result.arrayOne[1].objValue).toEqual('more value');
		});
	});
});

describe('regression test for bug #10, ', function () {
	let lhs = {
		id: 'Release',
		phases: [{
			id: 'Phase1',
			tasks: [{
				id: 'Task1'
			}, {
				id: 'Task2'
			}]
		}, {
			id: 'Phase2',
			tasks: [{
				id: 'Task3'
			}]
		}]
	};
	let rhs = {
		id: 'Release',
		phases: [{
			// E: Phase1 -> Phase2
			id: 'Phase2',
			tasks: [{
				id: 'Task3'
			}]
		}, {
			id: 'Phase1',
			tasks: [{
				id: 'Task1'
			}, {
				id: 'Task2'
			}]
		}]
	};

	describe('differences in nested arrays can be applied', function () {
		let d = deepDiff(lhs, rhs);
		it('and the result equals the rhs', function () {
			// there should be differences
			expect(d).toBeDefined();
			expect(d.length).toBe(6);

			d.forEach(c => c.apply(lhs));
			expect(lhs).toEqual(rhs);
		});
	});
});

describe('regression test for bug #35', function () {
	let lhs = ['a', 'a', 'a'];
	let rhs = ['a'];

	it('can apply diffs between two top level arrays', function () {
		let d = deepDiff(lhs, rhs);

		d.forEach(function (c) {
			c.apply(lhs);
		});

		expect(lhs).toEqual(['a']);
	});
});

describe('Comparing regexes should work', function () {
	let lhs = /foo/;
	let rhs = /foo/i;

	it('can compare top level regex instances', function () {
		let d = deepDiff(lhs, rhs);

		expect(d?.length).toBe(1);

		expect(d[0]).toBeInstanceOf(EditLhs);
		let e = <EditLhs>d[0];
		expect(e.path).toEqual([]);
		expect(e.value).toBeInstanceOf(RegExp);
		expect(e.value.toString()).toBe('/foo/i');
		let u = e.apply(lhs);
		expect(u.previousValue).toBeInstanceOf(RegExp);
		expect(u.previousValue.toString()).toBe('/foo/');
		let a = <UnDoWithPrev>u.undo().redo();
		expect(a.previousValue).toBeInstanceOf(RegExp);
		expect(a.previousValue.toString()).toBe('/foo/');
	});

	it('can undo/redo regex instances', function () {
		let one = {'regexp': lhs};
		let two = {'regexp': rhs};
		let d = deepDiff(one, two);

		expect(d?.length).toBe(1);

		expect(d[0]).toBeInstanceOf(EditLhs);
		let e = <EditLhs>d[0];
		expect(e.path.length).toBe(1);
		expect(e.value).toBeInstanceOf(RegExp);
		expect(e.value.toString()).toBe('/foo/i');
		let u = e.apply(one);
		expect(u.previousValue).toBeInstanceOf(RegExp);
		expect(u.previousValue.toString()).toBe('/foo/');
		expect(one.regexp).toBeInstanceOf(RegExp);
		expect(one.regexp.toString()).toBe('/foo/i');
		u.undo();
		expect(one.regexp).toBeInstanceOf(RegExp);
		expect(one.regexp.toString()).toBe('/foo/');
	});
});

describe('subject.toString is not a function', function () {
	let lhs = {
		left: 'yes',
		right: 'no',
	};
	let rhs = {
		left: {
			toString: true,
		},
		right: 'no',
	};

	it('should not throw a TypeError', function () {
		let d = deepDiff(lhs, rhs);

		expect(d?.length).toBe(1);
	});
});


describe('regression test for issue #83', function () {
	let lhs = {
		date: null
	};
	let rhs = {
		date: null
	};

	it('should not detect a difference', function () {
		let d = deepDiff(lhs, rhs);
		expect(d).toEqual([]);
	});
});

describe('regression test for issue #70', function () {

	it('should detect a difference with undefined property on lhs', function () {
		let d = deepDiff({foo: undefined}, {});

		expect(d).toBeInstanceOf(Array);
		expect(d.length).toBe(1);

		expect(d[0]).toBeInstanceOf(RemoveFromLhs);
		expect(d[0].path).toBeInstanceOf(Array);
		expect(d[0].path.length).toBe(1);
		expect(d[0].path[0].segment).toBe('foo');
	});

	it('should detect a difference with undefined property on rhs', function () {
		let d = deepDiff({}, {foo: undefined});

		expect(d).toBeInstanceOf(Array);
		expect(d.length).toBe(1);

		expect(d[0]).toBeInstanceOf(AddToLhs);
		expect(d[0].path).toBeInstanceOf(Array);
		expect(d[0].path.length).toBe(1);
		expect(d[0].path[0].segment).toBe('foo');
		let a = <AddToLhs>d[0];
		expect(a.value).toBe(undefined);

	});
});

describe('regression test for issue #98', function () {
	let lhs = {foo: undefined};
	let rhs = {foo: undefined};

	it('should not detect a difference with two undefined property values', function () {
		let d = deepDiff(lhs, rhs);

		expect(d).toEqual([]);
	});
});

describe('regression tests for issue #102', function () {
	it('should not throw a TypeError', function () {

		let d = deepDiff(null, undefined);

		expect(d).toBeInstanceOf(Array);
		expect(d.length).toBe(1);
		expect(d[0]).toBeInstanceOf(RemoveFromLhs);

	});

	it('should not throw a TypeError', function () {

		let d = deepDiff(Object.create(null), {foo: undefined});

		expect(d).toBeInstanceOf(Array);
		expect(d.length).toBe(1);

		let a = <AddToLhs>d[0];
		expect(a.value).toBe(undefined);
	});
});

describe('Order indepedent array comparison should work', function () {
	it('can compare simple arrays in an order independent fashion', function () {
		let lhs = [1, 2, 3];
		let rhs = [1, 3, 2];

		let d = deepDiff(lhs, rhs, {laxArrayOrdering: true});
		expect(d).toEqual([]);
	});

	it('still works with repeated elements', function () {
		let lhs = [1, 1, 2];
		let rhs = [1, 2, 1];

		let d = deepDiff(lhs, rhs, {laxArrayOrdering: true});
		expect(d).toEqual([]);
	});

	it('works on complex objects', function () {
		let obj1 = {
			foo: 'bar',
			faz: [
				1,
				'pie',
				{
					food: 'yum'
				}
			]
		};

		let obj2 = {
			faz: [
				'pie',
				{
					food: 'yum'
				},
				1
			],
			foo: 'bar'
		};

		let d = deepDiff(obj1, obj2, {laxArrayOrdering: true});
		expect(d).toEqual([]);
	});

	it('should report some difference in non-equal arrays', function () {
		let lhs = [1, 2, 3];
		let rhs = [2, 2, 3];

		let d = deepDiff(lhs, rhs, {laxArrayOrdering: true});
		expect(d.length).toBeTruthy();
		d.forEach(c => c.apply(lhs));
		expect(lhs).toEqual(rhs);
	});
});

/*

describe('Diff-ing symbol-based keys should work', function () {
	const lhs = {
		[Symbol.iterator]: 'Iterator', // eslint-disable-line no-undef
		foo: 'bar'
	};
	const rhs = {
		foo: 'baz'
	};

	const res = deepDiff(lhs, rhs);
	expect(res).to.be.ok();
	expect(res).to.be.an('array');
	expect(res).to.have.length(2);

	let changed = 0, deleted = 0;
	for (const difference of res) {
		if (difference.kind === 'D') {
			deleted += 1;
		} else if (difference.kind === 'E') {
			changed += 1;
		}
	}

	expect(changed).to.be(1);
	expect(deleted).to.be(1);

});
*/
/*

https://github.com/benjamine/jsondiffpatch/blob/master/test/examples/diffpatch.js

describe('Examples', () => {
	arrayForEach(objectKeys(examples), groupName => {
		const group = examples[groupName];
		describe(groupName, () => {
			arrayForEach(group, example => {
				if (!example) {
					return;
				}
				const name =
					example.name ||
					`${valueDescription(example.left)} -> ${valueDescription(
						example.right
					)}`;
				describe(name, () => {
					before(function () {
						this.instance = new DiffPatcher(example.options);
					});
					if (example.error) {
						it(`diff should fail with: ${example.error}`, function () {
							const instance = this.instance;
							expect(() => {
								instance.diff(example.left, example.right);
							}).to.throw(example.error);
						});
						return;
					}
					it('can diff', function () {
						const delta = this.instance.diff(example.left, example.right);
						expect(delta).to.deep.equal(example.delta);
					});
					it('can diff backwards', function () {
						const reverse = this.instance.diff(example.right, example.left);
						expect(reverse).to.deep.equal(example.reverse);
					});
					if (!example.noPatch) {
						it('can patch', function () {
							const right = this.instance.patch(
								jsondiffpatch.clone(example.left),
								example.delta
							);
							expect(right).to.deep.equal(example.right);
						});
						it('can reverse delta', function () {
							let reverse = this.instance.reverse(example.delta);
							if (example.exactReverse !== false) {
								expect(reverse).to.deep.equal(example.reverse);
							}
							else {
								// reversed delta and the swapped-diff delta are
								// not always equal, to verify they're equivalent,
								// patch and compare the results
								expect(
									this.instance.patch(
										jsondiffpatch.clone(example.right),
										reverse
									)
								).to.deep.equal(example.left);
								reverse = this.instance.diff(example.right, example.left);
								expect(
									this.instance.patch(
										jsondiffpatch.clone(example.right),
										reverse
									)
								).to.deep.equal(example.left);
							}
						});
						it('can unpatch', function () {
							const left = this.instance.unpatch(
								jsondiffpatch.clone(example.right),
								example.delta
							);
							expect(left).to.deep.equal(example.left);
						});
					}
				});
			});
		});
	});
});

describe('.clone', () => {
	it('clones complex objects', () => {
		const obj = {
			name: 'a string',
			nested: {
				attributes: [
					{name: 'one', value: 345, since: new Date(1934, 1, 1)},
				],
				another: 'property',
				enabled: true,
				nested2: {
					name: 'another string',
				},
			},
		};
		const cloned = jsondiffpatch.clone(obj);
		expect(cloned).to.deep.equal(obj);
	});
	it('clones RegExp', () => {
		const obj = {
			pattern: /expr/gim,
		};
		const cloned = jsondiffpatch.clone(obj);
		expect(cloned).to.deep.equal({
			pattern: /expr/gim,
		});
	});
});

describe('using cloneDiffValues', () => {
	before(function () {
		this.instance = new DiffPatcher({
			cloneDiffValues: true,
		});
	});
	it('ensures deltas don\'t reference original objects', function () {
		const left = {
			oldProp: {
				value: 3,
			},
		};
		const right = {
			newProp: {
				value: 5,
			},
		};
		const delta = this.instance.diff(left, right);
		left.oldProp.value = 1;
		right.newProp.value = 8;
		expect(delta).to.deep.equal({
			oldProp: [{value: 3}, 0, 0],
			newProp: [{value: 5}],
		});
	});
});
*/

describe('Tests from odiff project', function () {
	//FUTURE:   Implement LCS (see ReadMe.md), and once implemented, refactor these so we can re-use (the relevant) tests [might be able to reduce the size of our diffs for laxArrrayOrdering as well].

	it('simple value test', function () {
		let d = deepDiff(1, 2);
		expect(d?.length).toBe(1);
		expect(d[0]).toBeInstanceOf(EditLhs);
		let c = <EditLhs>d[0];
		expect(c.value).toBe(2);
	});
	it('simple value test - strong equality', function () {
		let d = deepDiff('', 0);
		expect(d?.length).toBe(1);
		expect(d[0]).toBeInstanceOf(EditLhs);
		let c = <EditLhs>d[0];
		expect(c.value).toBe(0);
	});
	it('NaN test', function () {
		let a = {x: NaN};
		let b = {x: NaN};
		let d = deepDiff(a, b);
		expect(d.length).toBe(0);
	});
	it('Date test', function () {
		let d = deepDiff(new Date('2016-08-11'), new Date('2017-09-12'));
		expect(d?.length).toBe(1);
		expect(d[0]).toBeInstanceOf(EditLhs);
		let c = <EditLhs>d[0];
		expect(c.value.getTime()).toEqual(new Date('2017-09-12').getTime());
	});

	it('simple object remove', function () {
		let lhs = {x: 1};
		let d = deepDiff(lhs, {});
		expect(d?.length).toBe(1);
		expect(d[0]).toBeInstanceOf(RemoveFromLhs);

		let c = <RemoveFromLhs>d[0];
		c.apply(lhs);
		expect(lhs).toEqual(<any>{});
	});

	//TODO: Do we want to copy across 'undefined' keys?

	// xit('simple object diff', function () {
	// 	let a = {a: 1, b: 2, c: 3};
	// 	let b = {a: 1, b: 2, c: undefined, d: 3};
	//
	// 	let d = deepDiff(a, b);
	// 	expect(d?.length).toBe(2);
	//
	// 	expect(d[0]).toBeInstanceOf(EditLhs);
	// 	let c = <EditLhs>d[0];
	// 	expect(c.value).toBe(undefined);
	//
	// 	expect(d[1]).toBeInstanceOf(EditLhs);
	// 	c = <EditLhs>d[1];
	// 	expect(c.value).toBe(3);
	//
	// 	d.forEach(c => c.apply(a));
	// 	expect(a).toEqual(b);
	// });

	// LCS
	// xit('simple array diff - rm', function () {
	// 	let a = [1, 2, 3];
	// 	let b = [];
	//
	// 	let d = deepDiff(a, b);
	// 	expect(d?.length).toBe(1);
	// 	expect(d[0]).toBeInstanceOf(RemoveFromLhs);
	//
	// 	let c = <RemoveFromLhs>d[0];
	// 	c.apply(a);
	// 	expect(a).toEqual([]);
	// });

	// LCS
	// xit('simple array diff - rm multiple contiguous', function () {
	// 	let a = [1, 2, 3];
	// 	let b = [1];
	//
	// 	let d = deepDiff(a, b);
	// 	expect(d?.length).toBe(1);
	// 	expect(d[0]).toBeInstanceOf(RemoveFromLhs);
	//
	// 	let c = <RemoveFromLhs>d[0];
	// 	c.apply(a);
	// 	expect(a).toEqual(b);
	// });

	// LCS
	// xit('simple array diff - add', function () {
	// 	let a = [];
	// 	let b = [1, 2, 3];
	//
	// 	let d = deepDiff(a, b);
	// 	expect(d?.length).toBe(1);
	// 	expect(d[0]).toBeInstanceOf(AddToLhs);
	//
	// 	let c = <AddToLhs>d[0];
	// 	expect(c.value).toEqual([1, 2, 3]);
	//
	// 	d.forEach(c => c.apply(a));
	// 	expect(a).toEqual(b);
	// });

	it('simple array diff - change', function () {
		let a = [1, 2, 3];
		let b = [1, 2, 4];

		let d = deepDiff(a, b);
		expect(d?.length).toBe(1);
		expect(d[0]).toBeInstanceOf(EditLhs);

		let c = <EditLhs>d[0];
		expect(c.value).toBe(4);

		d.forEach(c => c.apply(a));
		expect(a).toEqual(b);
	});
	it('array diff - added one, then removed one', function () {
		let a = <any>[1, 2, 3, 4, 5];
		let b = <any>[1, 1.1, 2, 3, 5];

		let d = deepDiff(a, b, {laxArrayOrdering: true});    // LCS also test false
		expect(d?.length).toBe(2);

		//  note that these are in reverse array order on purpose - so that applying the differences in order yields the correct result
		expect(d[0]).toBeInstanceOf(RemoveFromLhs);
		expect(d[1]).toBeInstanceOf(AddToLhs);

		d.forEach(c => c.apply(a));
		expect(a).toEqual(b);
	});
	it('complex array diff', function () {
		let a = <any>[{a: 1, b: 2, c: 3}, {x: 1, y: 2, z: 3}, {w: 9, q: 8, r: 7}];
		let b = <any>[{a: 1, b: 2, c: 3}, {t: 4, y: 5, u: 6}, {x: 1, y: '3', z: 3}, {t: 9, y: 9, u: 9}, {w: 9, q: 8, r: 7}];

		let d = deepDiff(a, b, {laxArrayOrdering: true});    // LCS also test false (which could be add[insert@1], edit[edit@2.y], add[insert@3])
		expect(d?.length).toBe(4);

		expect(d[0]).toBeInstanceOf(RemoveFromLhs);

		expect(d[1]).toBeInstanceOf(AddToLhs);
		let two = <AddToLhs>d[1];
		expect(two.value).toEqual({t: 4, y: 5, u: 6});

		expect(d[2]).toBeInstanceOf(AddToLhs);
		let three = <AddToLhs>d[2];
		expect(three.value).toEqual({x: 1, y: '3', z: 3});

		expect(d[3]).toBeInstanceOf(AddToLhs);
		let four = <AddToLhs>d[3];
		expect(four.value).toEqual({t: 9, y: 9, u: 9});

		d.forEach(c => c.apply(a));
		expect(a).toEqual(b);
	});
	it('complex array diff - distinguish set and add', function () {
		let a = <any>[{a: 1, b: 2}, {a: 3, b: 4}, {a: 5, b: 6}, {a: 7, b: 8}];
		let b = <any>[{a: 1, b: 2}, {a: 9, b: 8}, {a: 3, b: 4}, {a: 5, b: 6}, {a: 7, b: 8}];

		let d = deepDiff(a, b, {laxArrayOrdering: true});    // LCS also test false
		expect(d?.length).toBe(1);
		expect(d[0]).toBeInstanceOf(AddToLhs);

		let c = <AddToLhs>d[0];
		expect(c.value).toEqual({a: 9, b: 8});

		d.forEach(c => c.apply(a));
		expect(a).toEqual(b);
	});
	it('complex array diff - distinguish set and rm', function () {
		let a = <any>[{a: 1, b: 2}, {a: 9, b: 8}, {a: 3, b: 4}, {a: 5, b: 6}, {a: 7, b: 8}];
		let b = <any>[{a: 1, b: 2}, {a: 3, b: 4}, {a: 5, b: 6}, {a: 7, b: 8}];

		let d = deepDiff(a, b, {laxArrayOrdering: true});    // LCS also test false
		expect(d?.length).toBe(1);
		expect(d[0]).toBeInstanceOf(RemoveFromLhs);

		let c = <RemoveFromLhs>d[0];
		c.apply(a);
		expect(a).toEqual(b);
	});

	it('complex array diff - change then add', function () {
		let a = <any>[{a: 1, b: 2}, {a: 9, b: 8}, {a: 3, b: 4}, {a: 5, b: 6}, {a: 7, b: 8}];
		let b = <any>[{a: 1, b: 2}, {a: 9, b: '7'}, {a: 8, b: 1}, {a: 3, b: 4}, {a: 5, b: 6}, {a: 7, b: 8}];

		let d = deepDiff(a, b, {laxArrayOrdering: true});    // LCS also test false (which could be edit[edit@1.b], add[insert@2])
		expect(d?.length).toBe(3);
		expect(d[0]).toBeInstanceOf(RemoveFromLhs);
		expect(d[1]).toBeInstanceOf(AddToLhs);
		expect(d[2]).toBeInstanceOf(AddToLhs);

		let two = <AddToLhs>d[1];
		expect(two.value).toEqual({a: 9, b: '7'});

		let three = <AddToLhs>d[2];
		expect(three.value).toEqual({a: 8, b: 1});

		d.forEach(c => c.apply(a));
		expect(a).toEqual(b);
	});
	it('complex array diff - add then change', function () {
		let a = <any>[{a: 1, b: 2}, {a: 9, b: 8}, {a: 3, b: 4}, {a: 5, b: 6}, {a: 7, b: 8}];
		let b = <any>[{a: 1, b: 2}, {a: 8, b: 1}, {a: 9, b: '7'}, {a: 3, b: 4}, {a: 5, b: 6}, {a: 7, b: 8}];

		let d = deepDiff(a, b, {laxArrayOrdering: true});    // LCS also test false (which could be add[insert@1], edit[edit@3.b])
		expect(d?.length).toBe(3);
		expect(d[0]).toBeInstanceOf(RemoveFromLhs);
		expect(d[1]).toBeInstanceOf(AddToLhs);
		expect(d[2]).toBeInstanceOf(AddToLhs);

		let two = <AddToLhs>d[1];
		expect(two.value).toEqual({a: 8, b: 1});

		let three = <AddToLhs>d[2];
		expect(three.value).toEqual({a: 9, b: '7'});

		d.forEach(c => c.apply(a));
		expect(a).toEqual(b);
	});

	it('complex array diff - change then remove', function () {
		let a = <any>[{a: 1, b: 2}, {a: 9, b: 8}, {a: 3, b: 4}, {a: 5, b: 6}, {a: 7, b: 8}];
		let b = <any>[{a: 1, b: 2}, {a: 9, b: '7'}, {a: 5, b: 6}, {a: 7, b: 8}];

		let d = deepDiff(a, b, {laxArrayOrdering: true});    // LCS also test false (which could be edit[edit@1.b] remove[@2])
		expect(d?.length).toBe(3);
		expect(d[0]).toBeInstanceOf(RemoveFromLhs);
		expect(d[1]).toBeInstanceOf(RemoveFromLhs);
		expect(d[2]).toBeInstanceOf(AddToLhs);

		let three = <AddToLhs>d[2];
		expect(three.value).toEqual({a: 9, b: '7'});

		d.forEach(c => c.apply(a));
		expect(a).toEqual(b);
	});
	it('complex array diff - remove then change', function () {
		let a = <any>[{a: 1, b: 2}, {a: 9, b: 8}, {a: 3, b: 4}, {a: 5, b: 6}, {a: 7, b: 8}];
		let b = <any>[{a: 9, b: '7'}, {a: 3, b: 4}, {a: 5, b: 6}, {a: 7, b: 8}];

		let d = deepDiff(a, b, {laxArrayOrdering: true});    // LCS also test false (which could be edit[edit@0.b] remove[@1])
		expect(d?.length).toBe(3);
		expect(d[0]).toBeInstanceOf(RemoveFromLhs);
		expect(d[1]).toBeInstanceOf(RemoveFromLhs);
		expect(d[2]).toBeInstanceOf(AddToLhs);

		let three = <AddToLhs>d[2];
		expect(three.value).toEqual({a: 9, b: '7'});

		d.forEach(c => c.apply(a));
		expect(a).toEqual(b);
	});
	it('complex array diff - move', function () {
		let a = <any>[{a: 1, b: 2}, {a: 3, b: 4}, {a: 5, b: 6}, {a: 7, b: 8}, {a: 9, b: 10}];
		let b = <any>[{a: 1, b: 2}, {a: 5, b: 6}, {a: 7, b: 8}, {a: 3, b: 4}, {a: 9, b: 10}];

		let d = deepDiff(a, b, {laxArrayOrdering: true});    // LCS also test false (which could be add[@4] remove[@1])
		// a and b are the same (just in a different element order).
		expect(d?.length).toBe(0);
	});
	it('complex array diff - add then change similar', function () {
		let a = <any>[{a: 1, b: 2}, {a: 9, b: 8}, {a: 3, b: 4}, {a: 5, b: 6}, {a: 7, b: 8}];
		let b = <any>[{a: 1, b: 2}, {a: '8', b: 8}, {a: 7, b: 2}, {a: 3, b: 4}, {a: 5, b: 6}, {a: 7, b: 8}];

		let d = deepDiff(a, b, {laxArrayOrdering: true});    // LCS also test false (which could be add[@2] edit[1@a])
		expect(d?.length).toBe(3);
		expect(d[0]).toBeInstanceOf(RemoveFromLhs);
		expect(d[1]).toBeInstanceOf(AddToLhs);
		expect(d[2]).toBeInstanceOf(AddToLhs);

		let two = <AddToLhs>d[1];
		expect(two.value).toEqual({a: '8', b: 8});

		let three = <AddToLhs>d[2];
		expect(three.value).toEqual({a: 7, b: 2});

		d.forEach(c => c.apply(a));
		expect(a).toEqual(b);
	});
	it('complex array diff - remove then change similar', function () {
		let a = <any>[{a: 9, b: 2}, {a: 7, b: 4}, {a: 3, b: 4}, {a: 5, b: 6}, {a: 7, b: 8}];
		let b = <any>[{a: 9, b: '7'}, {a: 3, b: 4}, {a: 5, b: 6}, {a: 7, b: 8}];

		let d = deepDiff(a, b, {laxArrayOrdering: true});    // LCS also test false (which could be remove[@1] edit[0@b])
		expect(d?.length).toBe(3);
		expect(d[0]).toBeInstanceOf(RemoveFromLhs);
		expect(d[1]).toBeInstanceOf(RemoveFromLhs);
		expect(d[2]).toBeInstanceOf(AddToLhs);

		let three = <AddToLhs>d[2];
		expect(three.value).toEqual({a: 9, b: '7'});

		d.forEach(c => c.apply(a));
		expect(a).toEqual(b);
	});
	it('complex array diff - set two in a row', function () {
		let a = <any>[{a: 9, b: 2}, {a: 3, b: 4}, {a: 5, b: 6}, {a: 7, b: 8}];
		let b = <any>[{a: 9, b: '7'}, {a: '4', b: 4}, {a: 5, b: 6}, {a: 7, b: 8}];

		let d = deepDiff(a, b, {laxArrayOrdering: true});    // LCS also test false (which could be edit[0@b] edit[1@a])
		expect(d?.length).toBe(4);
		expect(d[0]).toBeInstanceOf(RemoveFromLhs);
		expect(d[1]).toBeInstanceOf(RemoveFromLhs);
		expect(d[2]).toBeInstanceOf(AddToLhs);
		expect(d[3]).toBeInstanceOf(AddToLhs);

		let three = <AddToLhs>d[2];
		expect(three.value).toEqual({a: 9, b: '7'});

		let four = <AddToLhs>d[3];
		expect(four.value).toEqual({a: '4', b: 4});

		d.forEach(c => c.apply(a));
		expect(a).toEqual(b);
	});
	it('deep diff test', function () {
		let a = {x: [1, 2, 3], y: {z: [{a: 1, b: 2}, {c: 3, d: 4}], aa: [[1, 2, 3], [5, 6, 7]]}};
		let b = {x: [1, 2, 4], y: {z: [{a: 1, b: 3}, {c: 3, d: 4}], aa: [[1, 2, 3], [9, 8], [5, 6.2, 7]]}};

		let d = deepDiff(a, b, {laxArrayOrdering: true});    // LCS also test false (which could be edit[x@2] edit[y.z@0.b edit[y.aa@2@1], add[y.aa@1])
		expect(d?.length).toBe(7);
		expect(d[0]).toBeInstanceOf(RemoveFromLhs);
		expect(d[1]).toBeInstanceOf(AddToLhs);
		expect(d[2]).toBeInstanceOf(RemoveFromLhs);
		expect(d[3]).toBeInstanceOf(AddToLhs);
		expect(d[4]).toBeInstanceOf(RemoveFromLhs);
		expect(d[5]).toBeInstanceOf(AddToLhs);
		expect(d[6]).toBeInstanceOf(AddToLhs);

		let two = <AddToLhs>d[1];
		expect(two.value).toBe(4);

		let four = <AddToLhs>d[3];
		expect(four.value).toEqual({a: 1, b: 3});

		let six = <AddToLhs>d[5];
		expect(six.value).toEqual([9, 8]);

		let seven = <AddToLhs>d[6];
		expect(seven.value).toEqual([5, 6.2, 7]);

		d.forEach(c => c.apply(a));
		expect(a).toEqual(b);
	});

	it('missing diff', function () {
		let a = <any>{b: [1, {x: 'y', e: 1}]};
		let b = <any>{b: [1, {x: 'z', e: 1}, 5]};

		let d = deepDiff(a, b);
		expect(d?.length).toBe(2);
		expect(d[0]).toBeInstanceOf(AddToLhs);
		expect(d[1]).toBeInstanceOf(EditLhs);

		let one = <AddToLhs>d[0];
		expect(one.value).toBe(5);

		let two = <EditLhs>d[1];
		expect(two.value).toBe('z');

		d.forEach(c => c.apply(a));
		expect(a).toEqual(b);
	});
});
