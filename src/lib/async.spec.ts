import test from 'ava';

import { asyncABC } from './async';

test('getABC', async (t) => {
  t.deepEqual(await asyncABC(), ['a', 'b', 'c']);
});
