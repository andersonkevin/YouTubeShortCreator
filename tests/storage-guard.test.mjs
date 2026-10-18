import test from 'node:test';
import assert from 'node:assert/strict';
import {checkFrameStorage} from '../storage-guard.mjs';

const frame={bytes:100,imageBytes:100,free:10_000_000_000,peak:100,remaining:10,
  budget:{max_scratch_bytes:1_000_000,min_free_bytes:5_000_000_000},project:true};
test('normal capture stays within both budgets',()=>assert.doesNotThrow(()=>checkFrameStorage(frame)));
test('scratch ceiling applies on every frame',()=>assert.throws(()=>checkFrameStorage({...frame,bytes:999_950,project:false}),/budget exceeded/));
test('free-space reserve applies between projection samples',()=>assert.throws(()=>checkFrameStorage({...frame,free:5_000_000_050,project:false}),/reserve reached/));
test('projected capture refuses a large remaining sequence',()=>assert.throws(()=>checkFrameStorage({...frame,remaining:20_000}),/Projected capture/));
test('projected capture leaves encoding reserve',()=>assert.throws(()=>checkFrameStorage({...frame,free:5_000_001_000}),/Insufficient scratch/));
test('invalid reserve cannot disable checks',()=>assert.throws(()=>checkFrameStorage({...frame,budget:{...frame.budget,min_free_bytes:0}}),/Invalid free/));
