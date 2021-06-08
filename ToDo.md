TODO:
- [ ] Implement sub-array differencing.  
The goal is LCS (https://en.wikipedia.org/wiki/Longest_common_subsequence_problem).
The biggest call for this is when *not* using laxArrayOrdering, and you have an insertion at index 2 of an otherwise identical set of arrays (where 0-1 are identical and 2-99 are identical to 3-100).
It would be really cool if you could swap in a big mostly the same block and then perform small edits to that swapped in block.
Once implemented, search for LCS in the code base as there are already some tests.
  
- [ ] Implement sub-string and sub-arraybuffer comparison.    
The goal would be to produce an overall smaller patche, at the expense of a larger number of Change operations.

- [ ] Maybe implement a deep merge (subclassed from Compare):  https://www.npmjs.com/package/deepmerge
  
- [ ] Would be interesting to export visitor for (de)serialize es6 JSON :-)

- [ ] Need to call out that materialize (in diff) must be explicit when applying to something other than the original lhs.  We should *not* default it to true because the effects are not undoable.

- [ ] Reviewed all the tests from:
https://github.com/flitbit/diff/blob/master/test/tests.js
https://github.com/substack/js-traverse/tree/master/test

- [ ] Might be cool [ or embarrassing :-) ]  to add ourselves to this benchmark project:  https://github.com/justsml/json-diff-performance
