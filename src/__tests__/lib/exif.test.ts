/**
 * EXIF Utility Tests
 *
 * Tests for JPEG EXIF stripping functionality.
 */

import { describe, it, expect } from 'vitest';
import { isJpeg, stripExif } from '../../lib/exif';

// Helper to create a minimal valid JPEG structure
function createMinimalJpeg(): Uint8Array {
  // SOI (Start of Image)
  const soi = [0xff, 0xd8];

  // APP0 (JFIF marker) - minimal
  const app0 = [
    0xff, 0xe0, // APP0 marker
    0x00, 0x10, // Length (16 bytes)
    0x4a, 0x46, 0x49, 0x46, 0x00, // "JFIF\0"
    0x01, 0x01, // Version 1.1
    0x00, // Aspect ratio units
    0x00, 0x01, // X density
    0x00, 0x01, // Y density
    0x00, 0x00, // No thumbnail
  ];

  // SOS (Start of Scan) - minimal
  const sos = [
    0xff, 0xda, // SOS marker
    0x00, 0x08, // Length
    0x01, // Number of components
    0x01, 0x00, // Component selector
    0x00, 0x3f, 0x00, // Spectral selection
  ];

  // Some fake image data and EOI (End of Image)
  const imageData = [0x00, 0x00, 0x00, 0xff, 0xd9];

  return new Uint8Array([...soi, ...app0, ...sos, ...imageData]);
}

// Helper to create a JPEG with APP1 (EXIF) segment
function createJpegWithExif(): Uint8Array {
  // SOI (Start of Image)
  const soi = [0xff, 0xd8];

  // APP0 (JFIF marker) - minimal
  const app0 = [
    0xff, 0xe0, // APP0 marker
    0x00, 0x10, // Length (16 bytes)
    0x4a, 0x46, 0x49, 0x46, 0x00, // "JFIF\0"
    0x01, 0x01, // Version 1.1
    0x00, // Aspect ratio units
    0x00, 0x01, // X density
    0x00, 0x01, // Y density
    0x00, 0x00, // No thumbnail
  ];

  // APP1 (EXIF marker) - fake EXIF data
  // Length = 2 (length field) + 6 ("Exif\0\0") + 12 (TIFF data) = 20 = 0x14
  const app1 = [
    0xff, 0xe1, // APP1 marker
    0x00, 0x14, // Length (20 bytes including length field)
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // "Exif\0\0"
    // Fake TIFF header and data (12 bytes)
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08,
    0x00, 0x00, 0x00, 0x00,
  ];

  // SOS (Start of Scan) - minimal
  const sos = [
    0xff, 0xda, // SOS marker
    0x00, 0x08, // Length
    0x01, // Number of components
    0x01, 0x00, // Component selector
    0x00, 0x3f, 0x00, // Spectral selection
  ];

  // Some fake image data and EOI (End of Image)
  const imageData = [0x00, 0x00, 0x00, 0xff, 0xd9];

  return new Uint8Array([...soi, ...app0, ...app1, ...sos, ...imageData]);
}

describe('EXIF Utility', () => {
  describe('isJpeg', () => {
    it('should return true for valid JPEG', () => {
      const jpeg = createMinimalJpeg();
      expect(isJpeg(jpeg.buffer)).toBe(true);
    });

    it('should return false for empty buffer', () => {
      expect(isJpeg(new ArrayBuffer(0))).toBe(false);
    });

    it('should return false for too small buffer', () => {
      expect(isJpeg(new ArrayBuffer(1))).toBe(false);
    });

    it('should return false for non-JPEG data', () => {
      const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG signature
      expect(isJpeg(png.buffer)).toBe(false);
    });

    it('should return false for random data', () => {
      const random = new Uint8Array([0x00, 0x11, 0x22, 0x33]);
      expect(isJpeg(random.buffer)).toBe(false);
    });
  });

  describe('stripExif', () => {
    it('should return original buffer for non-JPEG', () => {
      const notJpeg = new Uint8Array([0x00, 0x11, 0x22, 0x33]);
      const result = stripExif(notJpeg.buffer);
      expect(new Uint8Array(result)).toEqual(notJpeg);
    });

    it('should return buffer without EXIF for JPEG with EXIF', () => {
      const jpegWithExif = createJpegWithExif();
      const result = stripExif(jpegWithExif.buffer);
      const resultArray = new Uint8Array(result);

      // Result should be smaller (EXIF removed)
      expect(resultArray.length).toBeLessThan(jpegWithExif.length);

      // Result should still be valid JPEG (starts with SOI)
      expect(resultArray[0]).toBe(0xff);
      expect(resultArray[1]).toBe(0xd8);

      // Result should not contain APP1 marker (0xFFE1)
      let hasApp1 = false;
      for (let i = 0; i < resultArray.length - 1; i++) {
        if (resultArray[i] === 0xff && resultArray[i + 1] === 0xe1) {
          hasApp1 = true;
          break;
        }
      }
      expect(hasApp1).toBe(false);
    });

    it('should preserve JPEG without EXIF', () => {
      const jpegWithoutExif = createMinimalJpeg();
      const result = stripExif(jpegWithoutExif.buffer);
      const resultArray = new Uint8Array(result);

      // Should still be valid JPEG
      expect(resultArray[0]).toBe(0xff);
      expect(resultArray[1]).toBe(0xd8);

      // Should still contain APP0
      let hasApp0 = false;
      for (let i = 0; i < resultArray.length - 1; i++) {
        if (resultArray[i] === 0xff && resultArray[i + 1] === 0xe0) {
          hasApp0 = true;
          break;
        }
      }
      expect(hasApp0).toBe(true);
    });

    it('should preserve SOI marker', () => {
      const jpeg = createJpegWithExif();
      const result = stripExif(jpeg.buffer);
      const resultArray = new Uint8Array(result);

      expect(resultArray[0]).toBe(0xff);
      expect(resultArray[1]).toBe(0xd8);
    });

    it('should preserve APP0 (JFIF) segment', () => {
      const jpeg = createJpegWithExif();
      const result = stripExif(jpeg.buffer);
      const resultArray = new Uint8Array(result);

      // Find APP0 marker
      let hasApp0 = false;
      for (let i = 0; i < resultArray.length - 1; i++) {
        if (resultArray[i] === 0xff && resultArray[i + 1] === 0xe0) {
          hasApp0 = true;
          break;
        }
      }
      expect(hasApp0).toBe(true);
    });

    it('should preserve SOS and image data', () => {
      const jpeg = createJpegWithExif();
      const result = stripExif(jpeg.buffer);
      const resultArray = new Uint8Array(result);

      // Find SOS marker
      let hasSos = false;
      for (let i = 0; i < resultArray.length - 1; i++) {
        if (resultArray[i] === 0xff && resultArray[i + 1] === 0xda) {
          hasSos = true;
          break;
        }
      }
      expect(hasSos).toBe(true);

      // Should end with EOI
      expect(resultArray[resultArray.length - 2]).toBe(0xff);
      expect(resultArray[resultArray.length - 1]).toBe(0xd9);
    });
  });
});
