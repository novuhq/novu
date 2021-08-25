/**
 * A sample async function (to demo Typescript's es7 async/await down-leveling).
 *
 * ### Example (es imports)
 * ```js
 * import { asyncABC } from 'typescript-starter'
 * console.log(await asyncABC())
 * // => ['a','b','c']
 * ```
 *
 * ### Example (commonjs)
 * ```js
 * var double = require('typescript-starter').asyncABC;
 * asyncABC().then(console.log);
 * // => ['a','b','c']
 * ```
 *
 * @returns a Promise which should contain `['a','b','c']`
 */
export const asyncABC = async () => {
  const somethingSlow = (index: 0 | 1 | 2) => {
    const storage = 'abc'.charAt(index);
    return new Promise<string>((resolve) =>
      // later...
      resolve(storage)
    );
  };
  const a = await somethingSlow(0);
  const b = await somethingSlow(1);
  const c = await somethingSlow(2);
  return [a, b, c];
};
