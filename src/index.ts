/**
 * This index exports the most commonly used classes, functions, constants, types, etc. for this package.
 * No encapsulation is meant to be implied for things not listed here (this is simply a convenience to reduce clutter in common scenarios).
 * If something is exported from it's module, it's fair game to import into yours.
 */
export * from './discover';
export {enumerable} from './enumerable';
export {TraverseOptions, TraverseVisitorFnType, ChildrenCbType, Traverse, traverse} from './traverse';
export {EqualOptions, Equal, deepEqual} from './equal';
export {CopyOptions, Copy, deepCopy} from './copy';
export {Change, writeChangesToExJson, loadChangesFromExJson} from './patch';
export {DiffOptions, Diff, deepDiff} from './diff';
