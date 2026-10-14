import test from 'node:test';
import assert from 'node:assert/strict';
import {
  countTokens,
  checkApiKeys,
  convertJsonToToonUtil,
  convertToonToJsonUtil,
} from '../utils.js';

test('countTokens counts tokens accurately', () => {
  const count = countTokens('Hello world');
  assert.equal(count, 2);
  assert.equal(countTokens(''), 0);
});

test('checkApiKeys returns status correctly', () => {
  const statusEmpty = checkApiKeys(null, null);
  assert.equal(typeof statusEmpty.gemini_configured, 'boolean');
  assert.equal(typeof statusEmpty.langsmith_connected, 'boolean');

  const statusCustom = checkApiKeys('custom_gemini_key', 'custom_langsmith_key');
  assert.equal(statusCustom.gemini_configured, true);
  assert.equal(statusCustom.langsmith_connected, true);
});

test('convertJsonToToonUtil converts JSON and computes savings', () => {
  const jsonInput = JSON.stringify([
    { id: 1, name: 'Alice', age: 30 },
    { id: 2, name: 'Bob', age: 25 },
  ]);

  const result = convertJsonToToonUtil(jsonInput, 2, ',');
  assert.ok(result.output);
  assert.ok(result.output.includes('Alice'));
  assert.ok(result.output.includes('Bob'));
  assert.ok(result.json_data_tokens > 0);
  assert.ok(result.toon_data_tokens > 0);
  assert.ok(result.savings >= 0);
  assert.ok(typeof result.savings_percent === 'number');
});

test('convertToonToJsonUtil converts TOON back to valid JSON', () => {
  const jsonInput = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
  ];
  const conversion = convertJsonToToonUtil(JSON.stringify(jsonInput), 2, ',');
  const reversed = convertToonToJsonUtil(conversion.output);

  assert.ok(reversed.output);
  const parsed = JSON.parse(reversed.output);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].name, 'Alice');
  assert.equal(parsed[1].name, 'Bob');
});
