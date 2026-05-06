import { describe, it, expect } from 'vitest';
import { trimLeadingZeros } from './utils';

describe('trimLeadingZeros', () => {
  it('should remove leading zeros from a string', () => {
    expect(trimLeadingZeros('000123')).toBe('123');
    expect(trimLeadingZeros('001002')).toBe('1002');
  });

  it('should return "0" if the string is all zeros', () => {
    expect(trimLeadingZeros('000')).toBe('0');
    expect(trimLeadingZeros('0')).toBe('0');
  });

  it('should return the original string if it has no leading zeros', () => {
    expect(trimLeadingZeros('123')).toBe('123');
    expect(trimLeadingZeros('ABC')).toBe('ABC');
  });

  it('should handle strings with letters and leading zeros', () => {
    expect(trimLeadingZeros('000ABC')).toBe('ABC');
  });

  it('should return an empty string if input is empty', () => {
    expect(trimLeadingZeros('')).toBe('');
  });

  it('should handle undefined or null gracefully if passed (via casting)', () => {
    expect(trimLeadingZeros(undefined as unknown as string)).toBe('');
    expect(trimLeadingZeros(null as unknown as string)).toBe('');
  });
});
