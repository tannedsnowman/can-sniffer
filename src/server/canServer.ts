import { WebSocketServer, WebSocket } from 'ws';
import { CANMessage } from '../types/can.js';

// This is a mock implementation. Replace with actual CAN bus interface code
class CANBusInterface {
  private interval: NodeJS.Timeout | null = null;

  startListening(callback: (message: CANMessage) => void) {
    // Mock CAN messages for testing
    this.interval = setInterval(() => {
      const mockMessage: CANMessage = {
        id: Math.floor(Math.random() * 0x7FF), // Standard CAN ID (11 bits)
        data: Array.from({ length: 8 }, () => Math.floor(Math.random() * 256)),
        timestamp: Date.now(),
        dlc: 8
      };
      callback(mockMessage);
    }, 1000);
  }

  stopListening() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

export function startCANServer(port: number = 3001) {
  const wss = new WebSocketServer({ port });
  const canInterface = new CANBusInterface();

  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected');

    canInterface.startListening((message) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
      canInterface.stopListening();
    });
  });

  console.log(`CAN WebSocket server started on port ${port}`);
  return wss;
} 