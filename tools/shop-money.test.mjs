import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/app/core/shop/money.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { parseRsd, minorToInput, formatRsd } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('RSD input has exact integer conversion and round-trip', () => {
  for (const [input, minor] of [['3200,00', 320000], ['0.01', 1], ['19,9', 1990], ['0', 0], ['21474836,47', 2147483647]]) {
    assert.equal(parseRsd(input), minor);
    assert.equal(parseRsd(minorToInput(minor)), minor);
  }
  assert.equal(formatRsd(320000), '3.200,00 дин.');
});

test('RSD input rejects ambiguous, fractional, overflowing and nonnumeric values', () => {
  for (const input of ['', '-1', 'NaN', '1e3', '3.200,00', '1.001', '21474836,48', '1,2,3']) assert.equal(parseRsd(input), null);
  assert.throws(() => formatRsd(0.1));
});
