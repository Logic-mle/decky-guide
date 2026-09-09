import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/reading-state.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const { readProgress, writeProgress, readFontSize, writeFontSize, filterChapters } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
function storage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}
const record = (page = 1) => ({ url: `https://www.gamersky.com/handbook/202609/123_${page}.shtml`, title: '攻略', chapter: `章节 ${page}`, position: { block: 7, fraction: .3 }, updatedAt: page });
test('progress survives reopening and is isolated by game', () => {
  const s = storage();
  writeProgress(s, 'game:1', record(1)); writeProgress(s, 'game:2', record(2));
  assert.deepEqual(readProgress(s, 'game:1'), record(1));
  assert.deepEqual(readProgress(s, 'game:2'), record(2));
  assert.equal(readProgress(s, 'game:3'), null);
  writeProgress(s, 'game:1', record(3));
  assert.deepEqual(readProgress(s, 'game:1'), record(3));
});
test('corrupt and unsafe saved data are ignored, malformed store can recover', () => {
  const s = storage(); s.setItem('decky-guide.reading.v1', 'null');
  assert.equal(readProgress(s, 'a'), null);
  assert.equal(writeProgress(s, 'a', record()), true);
  assert.deepEqual(readProgress(s, 'a'), record());
  for (const bad of [ { ...record(), url: 'https://gamersky.com.evil.example/a' }, { ...record(), position: { block: -1, fraction: 0 } }, { ...record(), position: { block: 0, fraction: 8 } } ]) {
    s.setItem('decky-guide.reading.v1', JSON.stringify({ a: bad }));
    assert.equal(readProgress(s, 'a'), null);
  }
  assert.equal(writeProgress({ getItem() { throw Error(); }, setItem() { throw Error(); } }, 'a', record()), false);
});
test('history is bounded to the 100 most recent games', () => {
  const s = storage(); for (let i = 1; i <= 105; i++) writeProgress(s, `game:${i}`, record(i));
  assert.equal(readProgress(s, 'game:1'), null);
  assert.deepEqual(readProgress(s, 'game:105'), record(105));
});
test('font preference validates values and tolerates unavailable storage', () => {
  const s = storage(); assert.equal(readFontSize(s), 14);
  writeFontSize(s, 18); assert.equal(readFontSize(s), 18);
  writeFontSize(s, 99); assert.equal(readFontSize(s), 14);
  assert.equal(readFontSize({ getItem() { throw Error(); } }), 14);
});
test('chapter search supports Chinese, mixed case, full width, multiple terms and no matches', () => {
  const chapters = [{ title: '第三章 Boss 战斗技巧' }, { title: '第二章 收集' }, { title: '第三章 支线' }];
  assert.deepEqual(filterChapters(chapters, ' 第三章 ＢＯＳＳ '), [chapters[0]]);
  assert.equal(filterChapters(chapters, '不存在').length, 0);
  assert.deepEqual(filterChapters(chapters, '   '), chapters);
});
