export type DataFormat = '8bit' | '16bit' | '32bit';
export type DataType = 'unsigned' | 'signed' | 'float';
export type ByteOrder = 'little' | 'big';

export interface ByteInterpretation {
  hex: string;
  decimal: number;
  binary: string;
}

export interface BytePairInterpretation {
  hex: string;
  signed: number;
  unsigned: number;
}

export interface ByteQuadInterpretation {
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

export interface CANMessage {
  id: number;
  data: number[];
  timestamp: number;
}

export interface ParsedCANData {
  raw: number[];
  timestamp: number;
  id: number;
  selected: boolean;
  interpretations?: DetailedDataInterpretation;
}

export type DeviceType = 'mock' | 'serial';

export interface SerialPortConfig {
  port: string;
  baudRate: number;
  dataBits: number;
  stopBits: number;
  parity: 'none' | 'even' | 'odd';
}

export interface CANDeviceConfig {
  type: 'mock' | 'serial';
  serialPort?: SerialPortConfig;
} 