const WebSocket = require('ws');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const http = require('http');

// Mock CAN bus interface
class MockCANInterface {
  constructor() {
    this.interval = null;
  }

  startListening(callback) {
    // Mock CAN messages for testing
    this.interval = setInterval(() => {
      const mockMessage = {
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

// Serial CAN bus interface
class SerialCANInterface {
  constructor(port, baudRate) {
    this.port = port;
    this.baudRate = baudRate;
    this.serialPort = null;
    this.parser = null;
  }

  startListening(callback) {
    try {
      this.serialPort = new SerialPort({
        path: this.port,
        baudRate: this.baudRate
      });

      this.parser = this.serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));

      this.parser.on('data', (line) => {
        try {
          // Parse CAN message from serial data
          // This is a simple example - adjust based on your actual CAN device format
          const parts = line.split(',');
          if (parts.length >= 2) {
            const id = parseInt(parts[0], 16);
            const data = parts[1].split(' ').map(byte => parseInt(byte, 16));
            
            const message = {
              id,
              data,
              timestamp: Date.now(),
              dlc: data.length
            };
            
            callback(message);
          }
        } catch (error) {
          console.error('Error parsing CAN message:', error);
        }
      });

      this.serialPort.on('error', (error) => {
        console.error('Serial port error:', error);
      });

      console.log(`Connected to serial port ${this.port} at ${this.baudRate} baud`);
    } catch (error) {
      console.error('Error opening serial port:', error);
    }
  }

  stopListening() {
    if (this.serialPort) {
      this.serialPort.close();
      this.serialPort = null;
      this.parser = null;
    }
  }
}

// CAN interface factory
class CANInterfaceFactory {
  static createInterface(config) {
    if (config.type === 'mock') {
      return new MockCANInterface();
    } else if (config.type === 'serial' && config.serialPort) {
      return new SerialCANInterface(config.serialPort.port, config.serialPort.baudRate);
    } else {
      throw new Error('Invalid CAN interface configuration');
    }
  }
}

// Create HTTP server
const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Handle /ports endpoint
  if (req.url === '/ports' && req.method === 'GET') {
    SerialPort.list()
      .then(ports => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(ports.map(port => port.path)));
      })
      .catch(error => {
        console.error('Error listing serial ports:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to list serial ports' }));
      });
    return;
  }
  
  // Default response
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

// Start the HTTP server
server.listen(3002, () => {
  console.log('HTTP server started on port 3002');
});

// Start the CAN WebSocket server
const wss = new WebSocket.Server({ server });
let currentInterface = null;

// Default to mock interface
let currentConfig = {
  type: 'mock'
};

wss.on('connection', (ws) => {
  console.log('Client connected');

  // Send current configuration to the client
  ws.send(JSON.stringify({
    type: 'config',
    config: currentConfig
  }));

  // Send available ports to the client
  SerialPort.list()
    .then(ports => {
      ws.send(JSON.stringify({
        type: 'ports',
        ports: ports.map(port => port.path)
      }));
    })
    .catch(error => {
      console.error('Error listing serial ports:', error);
    });

  // Handle configuration changes from client
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'config') {
        // Stop current interface if it exists
        if (currentInterface) {
          currentInterface.stopListening();
        }

        // Update configuration
        currentConfig = data.config;
        
        // Create new interface
        currentInterface = CANInterfaceFactory.createInterface(currentConfig);
        
        // Start listening with the new interface
        currentInterface.startListening((message) => {
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({
              type: 'can_message',
              message
            }));
          }
        });

        // Acknowledge configuration change
        ws.send(JSON.stringify({
          type: 'config_ack',
          success: true
        }));
      }
    } catch (error) {
      console.error('Error handling message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  });

  // Start with current configuration
  if (currentInterface) {
    currentInterface.startListening((message) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'can_message',
          message
        }));
      }
    });
  }

  ws.on('close', () => {
    console.log('Client disconnected');
    if (currentInterface) {
      currentInterface.stopListening();
    }
  });
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down servers...');
  if (currentInterface) {
    currentInterface.stopListening();
  }
  server.close();
  process.exit();
}); 