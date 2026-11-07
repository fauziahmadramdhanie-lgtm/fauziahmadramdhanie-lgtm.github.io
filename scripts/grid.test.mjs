import assert from 'node:assert/strict';
import test from 'node:test';
import { esc } from '../src/esc.js';
import { fitGrid, ASPECT, MAX_W } from '../src/grid.js';

const EDGE = { top: 76, bottom: 112, side: 20 }; // as in cards.js
const SCREENS = [[375, 812], [745, 615], [1000, 640], [1920, 1080], [3840, 2160]]; // phone ... 4K
const COUNTS = [1, 2, 10, 15]; // 10 work cards, 15 credentials, and the edges

test('cards stay inside the free area, keep 5:7, and never touch', () => {
  for (const [W, H] of SCREENS) {
    for (const n of COUNTS) {
      const where = `${W}x${H}, ${n} cards`;
      const slots = fitGrid(n, W, H, EDGE);
      assert.equal(slots.length, n, where);
      for (const s of slots) {
        assert.ok(s.x >= EDGE.side - 0.01 && s.x + s.w <= W - EDGE.side + 0.01, `x out of area: ${where}`);
        assert.ok(s.y >= EDGE.top - 0.01 && s.y + s.h <= H - EDGE.bottom + 0.01, `y out of area: ${where}`);
        assert.ok(s.w <= MAX_W + 0.01 && s.w >= 60, `width ${s.w} at ${where}`);
        assert.ok(Math.abs(s.w / s.h - ASPECT) < 1e-9, `ratio: ${where}`);
      }
      slots.forEach((a, i) =>
        slots.slice(i + 1).forEach((b) => {
          const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
          const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
          assert.ok(!(w > 0 && h > 0), `cards overlap: ${where}`);
        }),
      );
    }
  }
});

test('esc makes text safe for HTML attributes and content', () => {
  assert.equal(esc('He said "hi" & <b>'), 'He said &quot;hi&quot; &amp; &lt;b&gt;');
});
