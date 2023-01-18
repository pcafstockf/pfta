# pfta
(**Property Filtering Traversal Algorithms**)

[![CI Actions](https://github.com/pcafstockf/pfta/workflows/CI/badge.svg)](https://github.com/pcafstockf/pfta/actions)
[![Publish Actions](https://github.com/pcafstockf/pfta/workflows/NPM%20Publish/badge.svg)](https://github.com/pcafstockf/pfta/actions)
[![npm version](https://badge.fury.io/js/pfta.svg)](https://badge.fury.io/js/pfta)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
![OSS Lifecycle](https://img.shields.io/osslifecycle/pcafstockf/pfta.svg)

## About
Deep Equal, Copy, Visit, Traverse, and Diff operations using configurable property iterators and filters.

There are many JavaScript libraries with better implementations of deep operations like Equal, Copy, Visit, Traverse, and Diff.  
However everything I found, hardcoded the selection of object properties to iterate for that library.

This project turns that upside down and starts with a producer function that (staticly or dynamically) determines the properties to be visited and those are fed to one of the algorithms (equal, copy, etc).  
No claim is made that these algorithms are fast, or efficient, only that they allow you to specify what properties will be considered.  
A number of predefined property selectors are provided such as for..in, Reflect.ownKeys, Object.getOwnPropertyNames, etc.
You can also pass in your own property producer callback.

###WARNING:  
This project should be considered an Alpha level implementation.  .  
While the code is solid (and in production for a while), it is used for my own projects and should not be considered a "baked" API.  
You are welcome to fork it, submit issues, and/or pull requests.  But unlike my other OS projects, I don't promise to respond.  
If there is significant interest, I'll get more serious about supporting a stable API and extending functionality.
On the other hand, if one of the better libraries becomes more flexible in what it iterates over, I may drop this project all together.  
You have been warned :-)

## Acknowledgements
 * Inspiration for the diff algorithm came from:
 *  https://github.com/andreyvit/json-diff (the coffee script code was very easy to follow)
 * Inspiration for the design/api came from:
 *  https://github.com/flitbit/diff
 * Things to consider came from the "Motivation" section of:
 *  https://github.com/Tixit/odiff
 * Understanding of all this came by refering to one of the most popular diff libs:
 *  https://github.com/benjamine/jsondiffpatch

Of course extreme gratitude to all of the above projects for the hard part of unit testing...  
Coming up with the tests themselves.


## MIT License

Copyright (c) 2021-2023 Frank Stock

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
