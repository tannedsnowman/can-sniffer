import { DataInterpretation } from '@/types/can';

interface ByteInterpretation {
  hex: string;
  decimal: number;
  binary: string;
}

interface BytePairInterpretation {
  hex: string;
  signed: number;
  unsigned: number;
}

interface ByteQuadInterpretation {
  hex: string;
  signed: number;
  unsigned: number;
  float: number;
}

export interface DetailedDataInterpretation {
  bytes: ByteInterpretation[];
  pairs: BytePairInterpretation[];
  quads: ByteQuadInterpretation[];
}

export function interpretData(data: number[]): DetailedDataInterpretation {
  const bytes: ByteInterpretation[] = data.map(byte => ({
    hex: byte.toString(16).padStart(2, '0'),
    decimal: byte,
    binary: byte.toString(2).padStart(8, '0')
  }));

  const pairs: BytePairInterpretation[] = [];
  for (let i = 0; i < data.length - 1; i += 2) {
    const bytes = new Uint8Array([data[i], data[i + 1]]);
    const view = new DataView(bytes.buffer);
    pairs.push({
      hex: bytes.map(b => b.toString(16).padStart(2, '0')).join(''),
      signed: view.getInt16(0, true),
      unsigned: view.getUint16(0, true)
    });
  }

  const quads: ByteQuadInterpretation[] = [];
  for (let i = 0; i < data.length - 3; i += 4) {
    const bytes = new Uint8Array([data[i], data[i + 1], data[i + 2], data[i + 3]]);
    const view = new DataView(bytes.buffer);
    quads.push({
      hex: bytes.map(b => b.toString(16).padStart(2, '0')).join(''),
      signed: view.getInt32(0, true),
      unsigned: view.getUint32(0, true),
      float: view.getFloat32(0, true)
    });
  }

  return {
    bytes,
    pairs,
    quads
  };
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

export function formatCANId(id: number): string {
  return `0x${id.toString(16).toUpperCase().padStart(3, '0')}`;
}

export function formatValue(value: number | undefined): string {
  if (value === undefined) return 'N/A';
  if (isNaN(value)) return 'NaN';
  return value.toString();
}

export function parseCANMessage(message: string): number[] {
  // This is a placeholder - implement actual CAN message parsing logic
  // based on your specific CAN bus interface
  return message.split(' ').map(byte => parseInt(byte, 16));
} 