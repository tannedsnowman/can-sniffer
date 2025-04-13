import { DataConversion } from '@/types/can';

interface DetectedFormat {
  format: '8bit' | '16bit' | '32bit';
  type: 'unsigned' | 'signed' | 'float';
  byteOrder: 'little' | 'big';
  confidence: number;  // 0-1 indicating how confident we are in this detection
}

function isLikelyFloat(value: number): boolean {
  // Check if the value has a decimal part and is within reasonable range
  return value % 1 !== 0 && value > -1e6 && value < 1e6;
}

function isLikelyNegative32Bit(data: number[]): boolean {
  // Check for patterns like 0xFFFFFFFF which typically indicate negative 32-bit values
  return data.length >= 4 &&
    data[0] === 0xFF &&
    data[1] === 0xFF &&
    data[2] === 0xFF &&
    data[3] === 0xFF;
}

function detectDataFormat(data: number[], id: number): DetectedFormat[] {
  const possibleFormats: DetectedFormat[] = [];

  // Try different byte orders and formats
  const byteOrders: ('little' | 'big')[] = ['little', 'big'];

  for (const byteOrder of byteOrders) {
    // Try 32-bit formats if we have 4 or more bytes
    if (data.length >= 4) {
      const bytes = byteOrder === 'little' ? [...data].reverse() : [...data];
      const view = new DataView(new Uint8Array(bytes).buffer);

      // Try 32-bit float
      const floatValue = view.getFloat32(0, byteOrder === 'little');
      if (!isNaN(floatValue) && isLikelyFloat(floatValue)) {
        possibleFormats.push({
          format: '32bit',
          type: 'float',
          byteOrder,
          confidence: 0.8
        });
      }

      // Try 32-bit signed
      const int32Value = view.getInt32(0, byteOrder === 'little');
      if (isLikelyNegative32Bit(data)) {
        possibleFormats.push({
          format: '32bit',
          type: 'signed',
          byteOrder,
          confidence: 0.9
        });
      }

      // Try 32-bit unsigned
      const uint32Value = view.getUint32(0, byteOrder === 'little');
      if (uint32Value <= 0x7FFFFFFF) {
        possibleFormats.push({
          format: '32bit',
          type: 'unsigned',
          byteOrder,
          confidence: 0.7
        });
      }
    }

    // Try 16-bit formats if we have 2 or more bytes
    if (data.length >= 2) {
      const bytes = byteOrder === 'little' ? [...data].reverse() : [...data];
      const view = new DataView(new Uint8Array(bytes).buffer);

      // Try 16-bit signed
      const int16Value = view.getInt16(0, byteOrder === 'little');
      if (int16Value >= -32768 && int16Value <= 32767) {
        possibleFormats.push({
          format: '16bit',
          type: 'signed',
          byteOrder,
          confidence: data.length === 2 ? 0.8 : 0.6
        });
      }

      // Try 16-bit unsigned
      const uint16Value = view.getUint16(0, byteOrder === 'little');
      if (uint16Value <= 65535) {
        possibleFormats.push({
          format: '16bit',
          type: 'unsigned',
          byteOrder,
          confidence: data.length === 2 ? 0.8 : 0.6
        });
      }
    }

    // 8-bit formats
    if (data.length >= 1) {
      // Try 8-bit signed
      const int8Value = new Int8Array(new Uint8Array(data).buffer)[0];
      if (int8Value >= -128 && int8Value <= 127) {
        possibleFormats.push({
          format: '8bit',
          type: 'signed',
          byteOrder,
          confidence: data.length === 1 ? 0.8 : 0.5
        });
      }

      // Try 8-bit unsigned
      if (data[0] <= 255) {
        possibleFormats.push({
          format: '8bit',
          type: 'unsigned',
          byteOrder,
          confidence: data.length === 1 ? 0.8 : 0.5
        });
      }
    }
  }

  // Sort by confidence
  return possibleFormats.sort((a, b) => b.confidence - a.confidence);
}

export function getBestDataFormat(data: number[], id: number): DataConversion {
  const detectedFormats = detectDataFormat(data, id);

  // Return the format with highest confidence, or a default if none detected
  return detectedFormats.length > 0 ? {
    format: detectedFormats[0].format,
    type: detectedFormats[0].type,
    byteOrder: detectedFormats[0].byteOrder
  } : {
    format: '32bit',
    type: 'unsigned',
    byteOrder: 'little'
  };
} 