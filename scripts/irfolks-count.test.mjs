import assert from 'node:assert/strict';
import test from 'node:test';
import { countItems } from './irfolks-count.mjs';

test('counts one article per <item>', () => {
  assert.equal(countItems('<rss><channel><item>a</item><item>b</item></channel></rss>'), 2);
  assert.equal(countItems('<rss><channel></channel></rss>'), 0);
});
