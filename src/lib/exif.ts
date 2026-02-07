/**
 * Image Metadata Stripping Utility
 *
 * Removes metadata from JPEG, PNG, and WebP images to protect privacy.
 * Metadata can contain sensitive information like GPS coordinates,
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

// ============================================================================
// PNG Metadata Stripping
// ============================================================================

/**
 * Check if a buffer is a valid PNG
 */
export function isPng(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 8) return false;
  const bytes = new Uint8Array(buffer);
  return (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4E &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0D &&
    bytes[5] === 0x0A &&
    bytes[6] === 0x1A &&
    bytes[7] === 0x0A
  );
}

/**
 * PNG chunk types that are safe to keep (critical + display-related ancillary).
 * All metadata chunks (eXIf, tEXt, iTXt, zTXt, tIME) are stripped.
 */
const PNG_SAFE_CHUNKS = new Set([
  'IHDR', 'PLTE', 'IDAT', 'IEND',
  'tRNS', 'gAMA', 'cHRM', 'sRGB', 'iCCP', 'sBIT', 'pHYs',
  'acTL', 'fcTL', 'fdAT',
]);

/**
 * Strip metadata from a PNG image.
 *
 * Removes text chunks (tEXt, iTXt, zTXt), EXIF chunks (eXIf),
 * and time chunks (tIME) while preserving critical and display chunks.
 *
 * @param buffer - The original PNG image as an ArrayBuffer
 * @returns A new ArrayBuffer with metadata removed, or the original if not a valid PNG
 */
export function stripPngMetadata(buffer: ArrayBuffer): ArrayBuffer {
  if (!isPng(buffer)) {
    return buffer;
  }

  const data = new Uint8Array(buffer);
  const signature = data.slice(0, 8);
  const chunks: Uint8Array[] = [signature];

  let offset = 8;
  while (offset + 12 <= data.length) {
    const length = (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
    const type = String.fromCharCode(data[offset + 4], data[offset + 5], data[offset + 6], data[offset + 7]);
    const chunkSize = 12 + length; // 4 length + 4 type + data + 4 CRC

    if (offset + chunkSize > data.length) {
      // Chunk extends beyond file - include remaining data as-is
      break;
    }

    if (PNG_SAFE_CHUNKS.has(type)) {
      chunks.push(data.slice(offset, offset + chunkSize));
    }

    offset += chunkSize;
  }

  // Combine chunks
  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLength);
  let pos = 0;
  for (const chunk of chunks) {
    result.set(chunk, pos);
    pos += chunk.length;
  }

  return result.buffer;
}

// ============================================================================
// WebP Metadata Stripping
// ============================================================================

/**
 * Check if a buffer is a valid WebP
 */
export function isWebp(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 12) return false;
  const bytes = new Uint8Array(buffer);
  return (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && // RIFF
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50   // WEBP
  );
}

/**
 * WebP RIFF chunk FourCCs that are safe to keep.
 * EXIF and XMP chunks are stripped.
 */
const WEBP_SAFE_CHUNKS = new Set([
  'VP8 ', 'VP8L', 'VP8X', 'ANIM', 'ANMF', 'ALPH', 'ICCP',
]);

/**
 * Strip metadata from a WebP image.
 *
 * Removes EXIF and XMP RIFF chunks while preserving image data
 * and essential structural chunks.
 *
 * @param buffer - The original WebP image as an ArrayBuffer
 * @returns A new ArrayBuffer with metadata removed, or the original if not a valid WebP
 */
export function stripWebpMetadata(buffer: ArrayBuffer): ArrayBuffer {
  if (!isWebp(buffer)) {
    return buffer;
  }

  const data = new Uint8Array(buffer);

  // RIFF header: 'RIFF' (4) + fileSize (4) + 'WEBP' (4) = 12 bytes
  const riffHeader = data.slice(0, 12);
  const chunks: Uint8Array[] = [];

  let offset = 12;
  while (offset + 8 <= data.length) {
    const fourcc = String.fromCharCode(data[offset], data[offset + 1], data[offset + 2], data[offset + 3]);
    const chunkDataSize = data[offset + 4] | (data[offset + 5] << 8) | (data[offset + 6] << 16) | (data[offset + 7] << 24);
    // RIFF chunks are padded to even size
    const paddedSize = chunkDataSize + (chunkDataSize % 2);
    const totalChunkSize = 8 + paddedSize; // 4 fourcc + 4 size + padded data

    if (offset + totalChunkSize > data.length) {
      // Chunk extends beyond file - include remaining data as-is for robustness
      break;
    }

    if (WEBP_SAFE_CHUNKS.has(fourcc)) {
      chunks.push(data.slice(offset, offset + totalChunkSize));
    }

    offset += totalChunkSize;
  }

  // Calculate new payload size (everything after RIFF header's first 8 bytes)
  // The RIFF file size field = total file size - 8 (the 'RIFF' + size fields)
  const payloadSize = 4 + chunks.reduce((sum, c) => sum + c.length, 0); // 4 for 'WEBP'
  const result = new Uint8Array(12 + chunks.reduce((sum, c) => sum + c.length, 0));

  // Write RIFF header with updated size
  result.set(riffHeader.slice(0, 4), 0); // 'RIFF'
  // Write new file size (little-endian)
  result[4] = payloadSize & 0xFF;
  result[5] = (payloadSize >> 8) & 0xFF;
  result[6] = (payloadSize >> 16) & 0xFF;
  result[7] = (payloadSize >> 24) & 0xFF;
  result.set(riffHeader.slice(8, 12), 8); // 'WEBP'

  let pos = 12;
  for (const chunk of chunks) {
    result.set(chunk, pos);
    pos += chunk.length;
  }

  return result.buffer;
}
