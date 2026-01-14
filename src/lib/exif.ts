/**
 * EXIF Stripping Utility
 *
 * Removes EXIF metadata from JPEG images to protect privacy.
 * EXIF data can contain sensitive information like GPS coordinates,
 * camera serial numbers, and timestamps.
 */

// JPEG markers
const SOI = 0xffd8; // Start of Image
const APP1 = 0xffe1; // EXIF/XMP data
const SOS = 0xffda; // Start of Scan (image data follows)

/**
 * Check if a buffer is a valid JPEG
 */
export function isJpeg(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 2) return false;
  const view = new DataView(buffer);
  return view.getUint16(0) === SOI;
}

/**
 * Strip EXIF data from a JPEG image
 *
 * This function removes APP1 segments (which contain EXIF and XMP data)
 * while preserving the image quality and other metadata.
 *
 * @param buffer - The original JPEG image as an ArrayBuffer
 * @returns A new ArrayBuffer with EXIF data removed, or the original if not a JPEG
 */
export function stripExif(buffer: ArrayBuffer): ArrayBuffer {
  if (!isJpeg(buffer)) {
    return buffer;
  }

  const input = new Uint8Array(buffer);
  const segments: Uint8Array[] = [];

  let offset = 0;

  // Read SOI marker
  if (input[0] !== 0xff || input[1] !== 0xd8) {
    return buffer;
  }

  // Add SOI marker
  segments.push(input.slice(0, 2));
  offset = 2;

  // Process segments until we hit SOS or end of file
  while (offset < input.length - 1) {
    // Each segment starts with 0xFF
    if (input[offset] !== 0xff) {
      // We've hit the image data or corrupt data
      break;
    }

    const marker = (input[offset] << 8) | input[offset + 1];

    // Check for SOS - everything after this is image data
    if (marker === SOS) {
      // Include SOS and all remaining data (the actual image)
      segments.push(input.slice(offset));
      break;
    }

    // Check for standalone markers (no length field)
    // These are markers from 0xFFD0 to 0xFFD9 (RST0-RST7, SOI, EOI)
    if (marker >= 0xffd0 && marker <= 0xffd9) {
      segments.push(input.slice(offset, offset + 2));
      offset += 2;
      continue;
    }

    // For other markers, read the length
    if (offset + 4 > input.length) {
      // Not enough data for length field
      break;
    }

    const length = (input[offset + 2] << 8) | input[offset + 3];
    const segmentEnd = offset + 2 + length;

    if (segmentEnd > input.length) {
      // Segment extends beyond file, corrupted
      break;
    }

    // Skip APP1 segments (EXIF and XMP data)
    if (marker === APP1) {
      offset = segmentEnd;
      continue;
    }

    // Keep all other segments
    segments.push(input.slice(offset, segmentEnd));
    offset = segmentEnd;
  }

  // If we didn't process anything meaningful, return original
  if (segments.length <= 1) {
    return buffer;
  }

  // Calculate total length
  const totalLength = segments.reduce((sum, seg) => sum + seg.length, 0);

  // Combine all segments
  const output = new Uint8Array(totalLength);
  let writeOffset = 0;

  for (const segment of segments) {
    output.set(segment, writeOffset);
    writeOffset += segment.length;
  }

  return output.buffer;
}
