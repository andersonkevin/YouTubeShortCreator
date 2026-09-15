import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const script=fileURLToPath(new URL('../capture.mjs',import.meta.url));
const rejected=(args,message)=>{
  const result=spawnSync(process.execPath,[script,'/missing/workspace','/missing/run',...args],{encoding:'utf8'});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,message);
};

test('render requires an absolute scratch argument before reading a workspace',()=>{
  rejected(['render','relative'],/Absolute scratch frame path required/);
  rejected(['render'],/AssertionError/);
  rejected(['qa','extra'],/AssertionError/);
});

test('capture rejects nonempty scratch and does not remove caller files',()=>{
  const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'shortcreator-media-test-')));
  try {
    const frames=path.join(root,'frames');
    fs.mkdirSync(frames);
    const marker=path.join(frames,'keep.txt');
    fs.writeFileSync(marker,'keep',{flag:'wx'});
    rejected(['render',frames],/Scratch frames must be empty/);
    assert.equal(fs.readFileSync(marker,'utf8'),'keep');
  } finally {fs.rmSync(root,{recursive:true});}
});

test('capture rejects scratch aliases and directories outside its owned shape',()=>{
  const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'shortcreator-media-test-')));
  try {
    const frames=path.join(root,'frames');
    fs.mkdirSync(frames);
    const alias=path.join(root,'alias');
    fs.symlinkSync(frames,alias);
    rejected(['render',alias],/Scratch path cannot contain symlinks/);
    const unrelated=path.join(root,'other');
    fs.mkdirSync(unrelated);
    rejected(['render',unrelated],/AssertionError/);
    assert.equal(fs.readdirSync(frames).length,0);
  } finally {fs.rmSync(root,{recursive:true});}
});
