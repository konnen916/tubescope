import { it, expect } from 'vitest';
import { esc } from '../src/lib/html';

it('escapes HTML metacharacters', () => {
  expect(esc('<img src=x onerror="alert(1)">')).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  expect(esc("a & b ' c")).toBe('a &amp; b &#39; c');
});

it('handles null, undefined, and numbers', () => {
  expect(esc(null)).toBe('');
  expect(esc(undefined)).toBe('');
  expect(esc(42)).toBe('42');
});
