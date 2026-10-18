import assert from 'node:assert/strict';

export function checkFrameStorage({bytes, imageBytes, free, peak, remaining, budget, project}) {
  assert.ok(Number.isSafeInteger(budget.max_scratch_bytes) && budget.max_scratch_bytes > 0, 'Invalid scratch budget');
  assert.ok(Number.isSafeInteger(budget.min_free_bytes) && budget.min_free_bytes >= 2_000_000_000, 'Invalid free-space reserve');
  assert.ok(bytes + imageBytes <= budget.max_scratch_bytes, 'Scratch budget exceeded; capture stopped');
  assert.ok(free >= imageBytes + budget.min_free_bytes, 'Free disk reserve reached; capture stopped');
  if (project) {
    const estimate = Math.ceil(peak * remaining * 1.5);
    assert.ok(bytes + estimate <= budget.max_scratch_bytes, 'Projected capture exceeds scratch budget');
    assert.ok(free >= estimate + budget.min_free_bytes, 'Insufficient scratch space for capture and encoding reserve');
  }
}
