import { describe, it, expect } from 'vitest';
import {
  parseAndFormatContactNumbers,
  getStdCodeForCity,
  isValidPhoneNumber,
} from '@/utils/phoneUtils';

describe('Phone Utility (Landline vs Mobile Classification & Prefix Formatting)', () => {
  it('correctly maps city names to STD codes with fallback to 022', () => {
    expect(getStdCodeForCity('Mumbai')).toBe('022');
    expect(getStdCodeForCity('Fort Mumbai, Maharashtra')).toBe('022');
    expect(getStdCodeForCity('Pune')).toBe('020');
    expect(getStdCodeForCity('New Delhi')).toBe('011');
    expect(getStdCodeForCity('Hyderabad')).toBe('040');
    expect(getStdCodeForCity('Bengaluru, Karnataka')).toBe('080');
    expect(getStdCodeForCity('Chennai')).toBe('044');
    expect(getStdCodeForCity('Unknown City')).toBe('022');
    expect(getStdCodeForCity('')).toBe('022');
  });

  it('classifies 10-digit numbers starting with 6-9 as Mobile Numbers with +91 prefix', () => {
    const res = parseAndFormatContactNumbers('9866225483', 'Hyderabad');
    expect(res).toHaveLength(1);
    expect(res[0].type).toBe('mobile');
    expect(res[0].label).toBe('Mobile Number');
    expect(res[0].display).toBe('+91 98662 25483');
    expect(res[0].prefix).toBe('+91');
    expect(res[0].dialValue).toBe('+919866225483');
  });

  it('classifies 91-prefixed 12-digit mobile numbers as Mobile Numbers with +91 prefix', () => {
    const res = parseAndFormatContactNumbers('919433372210', 'Kolkata');
    expect(res).toHaveLength(1);
    expect(res[0].type).toBe('mobile');
    expect(res[0].label).toBe('Mobile Number');
    expect(res[0].display).toBe('+91 94333 72210');
    expect(res[0].prefix).toBe('+91');
  });

  it('classifies 0-prefixed 11-digit mobile numbers as Mobile Numbers with +91 prefix', () => {
    const res = parseAndFormatContactNumbers('09820012345', 'Mumbai');
    expect(res).toHaveLength(1);
    expect(res[0].type).toBe('mobile');
    expect(res[0].label).toBe('Mobile Number');
    expect(res[0].display).toBe('+91 98200 12345');
    expect(res[0].prefix).toBe('+91');
  });

  it('classifies local landline numbers without STD code as Landlines with 022 prefix for Mumbai', () => {
    const res = parseAndFormatContactNumbers('6542421', 'Bandra E');
    expect(res).toHaveLength(1);
    expect(res[0].type).toBe('landline');
    expect(res[0].label).toBe('Landline / Telephone Number');
    expect(res[0].display).toBe('022-6542421');
    expect(res[0].prefix).toBe('022');
  });

  it('classifies local landline numbers without STD code with city-specific STD code', () => {
    const res = parseAndFormatContactNumbers('56117330', 'Pune');
    expect(res).toHaveLength(1);
    expect(res[0].type).toBe('landline');
    expect(res[0].label).toBe('Landline / Telephone Number');
    expect(res[0].display).toBe('020-56117330');
    expect(res[0].prefix).toBe('020');
  });

  it('preserves existing STD codes for landlines (e.g. 040, 0124, 0260)', () => {
    const hyd = parseAndFormatContactNumbers('040-66281368', 'Hyderabad');
    expect(hyd[0].label).toBe('Landline / Telephone Number');
    expect(hyd[0].display).toBe('040-66281368');
    expect(hyd[0].prefix).toBe('040');

    const vapi = parseAndFormatContactNumbers('02603052100', 'Vapi');
    expect(vapi[0].label).toBe('Landline / Telephone Number');
    expect(vapi[0].display).toBe('0260-3052100');
    expect(vapi[0].prefix).toBe('0260');

    const delhi = parseAndFormatContactNumbers('011-46781000', 'New Delhi');
    expect(delhi[0].label).toBe('Landline / Telephone Number');
    expect(delhi[0].display).toBe('011-46781000');
    expect(delhi[0].prefix).toBe('011');
  });

  it('parses multiple landline numbers separated by "/" with proper STD prefixes', () => {
    const res = parseAndFormatContactNumbers('56657391 / 66657391', 'Fort Mumbai');
    expect(res).toHaveLength(2);
    expect(res[0].label).toBe('Landline / Telephone Number');
    expect(res[0].display).toBe('022-56657391');
    expect(res[1].label).toBe('Landline / Telephone Number');
    expect(res[1].display).toBe('022-66657391');
  });

  it('handles mixed mobile and landline numbers in a single contact string', () => {
    const res = parseAndFormatContactNumbers('022-25800972 / 9820012345', 'Mumbai');
    expect(res).toHaveLength(2);
    expect(res[0].type).toBe('landline');
    expect(res[0].label).toBe('Landline / Telephone Number');
    expect(res[0].display).toBe('022-25800972');

    expect(res[1].type).toBe('mobile');
    expect(res[1].label).toBe('Mobile Number');
    expect(res[1].display).toBe('+91 98200 12345');
  });

  it('returns empty array when phone is missing or blank', () => {
    expect(parseAndFormatContactNumbers('')).toEqual([]);
    expect(parseAndFormatContactNumbers(null)).toEqual([]);
    expect(parseAndFormatContactNumbers('   ')).toEqual([]);
  });
});

describe('isValidPhoneNumber', () => {
  it('rejects null, undefined, empty strings, and whitespace', () => {
    expect(isValidPhoneNumber(null)).toBe(false);
    expect(isValidPhoneNumber(undefined)).toBe(false);
    expect(isValidPhoneNumber('')).toBe(false);
    expect(isValidPhoneNumber('   ')).toBe(false);
  });

  it('rejects placeholder symbols (case-insensitive and trimmed)', () => {
    const placeholders = [
      '-',
      '--',
      '---',
      '—',
      '+91-',
      '+91',
      'n/a',
      'na',
      'null',
      'none',
      'N/A',
      'NA',
      'None',
      'Null',
    ];
    for (const p of placeholders) {
      expect(isValidPhoneNumber(p)).toBe(false);
      expect(isValidPhoneNumber(`  ${p}  `)).toBe(false);
    }
  });

  it('rejects invalid phrases and mock strings', () => {
    expect(isValidPhoneNumber('switchboard')).toBe(false);
    expect(isValidPhoneNumber('+1 (555) Switchboard')).toBe(false);
    expect(isValidPhoneNumber('no contact')).toBe(false);
    expect(isValidPhoneNumber('No contact information available')).toBe(false);
    expect(isValidPhoneNumber('unavailable')).toBe(false);
    expect(isValidPhoneNumber('Unavailable')).toBe(false);
  });

  it('validates Indian mobile numbers and landlines', () => {
    expect(isValidPhoneNumber('9821230317')).toBe(true);
    expect(isValidPhoneNumber('+91-9821230317')).toBe(true);
    expect(isValidPhoneNumber('+91 98662 25483')).toBe(true);
    expect(isValidPhoneNumber('022-25800972')).toBe(true);
    expect(isValidPhoneNumber('+91-2242643060')).toBe(true);
    expect(isValidPhoneNumber('040-66281368')).toBe(true);
    expect(isValidPhoneNumber('6542421')).toBe(true);
  });

  it('validates international phone numbers with proper digits', () => {
    expect(isValidPhoneNumber('+1 (408) 555-0199')).toBe(true);
    expect(isValidPhoneNumber('+44 20 7946 0991')).toBe(true);
    expect(isValidPhoneNumber('+55 11 3138-5000')).toBe(true);
  });

  it('rejects numbers with fewer than 5 digits or containing only country code 91', () => {
    expect(isValidPhoneNumber('1234')).toBe(false);
    expect(isValidPhoneNumber('+91')).toBe(false);
    expect(isValidPhoneNumber('91')).toBe(false);
  });
});
