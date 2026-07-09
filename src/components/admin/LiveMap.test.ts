import { describe, it, expect } from 'vitest';
import { parseCoordinate, getUserObj } from '../../lib/mapUtils';

describe('LiveMap Helpers', () => {
  describe('parseCoordinate', () => {
    it('should parse valid numbers', () => {
      expect(parseCoordinate(1.23)).toBe(1.23);
      expect(parseCoordinate(-12.345)).toBe(-12.345);
    });

    it('should parse numeric strings', () => {
      expect(parseCoordinate('42.42')).toBe(42.42);
      expect(parseCoordinate('-0.123')).toBe(-0.123);
    });

    it('should return null for null, undefined, or empty values', () => {
      expect(parseCoordinate(null)).toBeNull();
      expect(parseCoordinate(undefined)).toBeNull();
      expect(parseCoordinate('')).toBeNull();
    });

    it('should return null for non-numeric strings', () => {
      expect(parseCoordinate('not-a-number')).toBeNull();
      expect(parseCoordinate('abc')).toBeNull();
    });
  });

  describe('getUserObj', () => {
    it('should return null if falsy', () => {
      expect(getUserObj(null)).toBeNull();
      expect(getUserObj(undefined)).toBeNull();
    });

    it('should return the first element if input is an array', () => {
      const arrayPayload = [{ name: 'Test Merchant', latitude: 1 }];
      expect(getUserObj(arrayPayload)).toEqual({ name: 'Test Merchant', latitude: 1 });
    });

    it('should return the object itself if input is a non-array object', () => {
      const singlePayload = { name: 'Test Merchant 2', latitude: 2 };
      expect(getUserObj(singlePayload)).toEqual({ name: 'Test Merchant 2', latitude: 2 });
    });
  });
});
