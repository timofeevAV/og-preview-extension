import { describe, it, expect } from 'vitest';

import type { OgData } from '@/lib/types';

import {
  getOgDataStatus,
  resolveDisplayData,
  KNOWN_OG_FIELDS,
  type OgDataStatus,
} from '@/lib/og-display';

// ─── getOgDataStatus ──────────────────────────────────────────────────────────

describe('getOgDataStatus', () => {
  it('returns "error" for null input (restricted page or content script not loaded)', () => {
    const result: OgDataStatus = getOgDataStatus(null);
    expect(result).toBe('error');
  });

  it('returns "empty" for an OgData object with no meaningful fields', () => {
    const result: OgDataStatus = getOgDataStatus({});
    expect(result).toBe('empty');
  });

  it('returns "empty" when all fields are empty strings (falsy)', () => {
    const data: OgData = { title: '', description: '', image: '' };
    expect(getOgDataStatus(data)).toBe('empty');
  });

  it('returns "partial" when only title is set', () => {
    const data: OgData = { title: 'Hello' };
    expect(getOgDataStatus(data)).toBe('partial');
  });

  it('returns "partial" when only image is set (no title or description)', () => {
    const data: OgData = { image: 'https://example.com/img.png' };
    expect(getOgDataStatus(data)).toBe('partial');
  });

  it('returns "partial" when title and description are set but image is missing', () => {
    const data: OgData = { title: 'T', description: 'D' };
    expect(getOgDataStatus(data)).toBe('partial');
  });

  it('returns "complete" when title, description, and image are all present', () => {
    const data: OgData = {
      title: 'T',
      description: 'D',
      image: 'https://example.com/img.png',
    };
    expect(getOgDataStatus(data)).toBe('complete');
  });

  it('returns "partial" when title and image are set but description is missing', () => {
    const data: OgData = { title: 'T', image: 'https://example.com/img.png' };
    expect(getOgDataStatus(data)).toBe('partial');
  });
});

// ─── resolveDisplayData ───────────────────────────────────────────────────────

describe('resolveDisplayData', () => {
  it('returns OG title when no twitter title is set', () => {
    const data: OgData = { title: 'OG' };
    const result = resolveDisplayData(data);
    expect(result.title).toBe('OG');
    expect(result.description).toBeUndefined();
    expect(result.image).toBeUndefined();
  });

  it('prefers twitterTitle over og:title when both are set', () => {
    const data: OgData = { title: 'OG', twitterTitle: 'TW' };
    const result = resolveDisplayData(data);
    expect(result.title).toBe('TW');
  });

  it('prefers twitterDescription over og:description when both are set', () => {
    const data: OgData = {
      description: 'OG desc',
      twitterDescription: 'TW desc',
    };
    const result = resolveDisplayData(data);
    expect(result.description).toBe('TW desc');
  });

  it('prefers twitterImage over og:image when both are set', () => {
    const data: OgData = { image: 'og.png', twitterImage: 'tw.png' };
    const result = resolveDisplayData(data);
    expect(result.image).toBe('tw.png');
  });

  it('uses twitterTitle as title when og:title is absent', () => {
    const data: OgData = { twitterTitle: 'TW only' };
    const result = resolveDisplayData(data);
    expect(result.title).toBe('TW only');
  });

  it('returns undefined for all fields when data is empty', () => {
    const data: OgData = {};
    const result = resolveDisplayData(data);
    expect(result.title).toBeUndefined();
    expect(result.description).toBeUndefined();
    expect(result.image).toBeUndefined();
  });
});

// ─── KNOWN_OG_FIELDS ─────────────────────────────────────────────────────────

describe('KNOWN_OG_FIELDS', () => {
  const requiredKeys: Array<keyof OgData> = [
    'title',
    'description',
    'image',
    'url',
    'siteName',
    'type',
  ];

  it('includes all 6 required fields for the MissingFields component', () => {
    const keys = KNOWN_OG_FIELDS.map((f) => f.key);
    for (const required of requiredKeys) {
      expect(keys).toContain(required);
    }
  });

  it('has at least 6 entries', () => {
    expect(KNOWN_OG_FIELDS.length).toBeGreaterThanOrEqual(6);
  });

  it('each entry has key, label, and description properties', () => {
    for (const field of KNOWN_OG_FIELDS) {
      expect(field).toHaveProperty('key');
      expect(field).toHaveProperty('label');
      expect(field).toHaveProperty('description');
      expect(typeof field.label).toBe('string');
      expect(typeof field.description).toBe('string');
    }
  });
});
