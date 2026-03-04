import { decode } from 'blurhash';

/**
 * Convert a blurhash string to a base64 BMP data URL.
 * Used server-side so blur placeholders render without client JS.
 */
export function blurhashToDataURL(
  hash: string,
  width = 32,
  height = 32
): string {
  try {
    const pixels = decode(hash, width, height);
    return rgbaPixelsToBmpDataURL(pixels, width, height);
  } catch {
    return '';
  }
}

/**
 * Encode RGBA pixels as a minimal BMP and return as a data URL.
 * BMP is simpler/faster to encode than PNG and works in all browsers.
 */
function rgbaPixelsToBmpDataURL(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): string {
  const rowSize = Math.ceil((width * 3) / 4) * 4; // rows padded to 4-byte boundary
  const pixelDataSize = rowSize * height;
  const headerSize = 54;
  const fileSize = headerSize + pixelDataSize;

  const buffer = new Uint8Array(fileSize);
  const view = new DataView(buffer.buffer);

  // BMP file header (14 bytes)
  buffer[0] = 0x42; // 'B'
  buffer[1] = 0x4d; // 'M'
  view.setUint32(2, fileSize, true);
  view.setUint32(10, headerSize, true);

  // DIB header (40 bytes)
  view.setUint32(14, 40, true); // header size
  view.setInt32(18, width, true);
  view.setInt32(22, -height, true); // negative = top-down
  view.setUint16(26, 1, true); // color planes
  view.setUint16(28, 24, true); // bits per pixel (BGR)
  view.setUint32(34, pixelDataSize, true);

  // Pixel data (BGR, bottom-up is handled by negative height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = headerSize + y * rowSize + x * 3;
      buffer[dstIdx] = pixels[srcIdx + 2]; // B
      buffer[dstIdx + 1] = pixels[srcIdx + 1]; // G
      buffer[dstIdx + 2] = pixels[srcIdx]; // R
    }
  }

  // Convert to base64
  let binary = '';
  for (let i = 0; i < buffer.length; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return `data:image/bmp;base64,${btoa(binary)}`;
}
