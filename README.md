# CAN Bus Sniffer

A modern web application for sniffing and analyzing CAN bus communications. Built with Next.js, TypeScript, and Tailwind CSS.

## Features

- Real-time CAN bus data monitoring
- Data conversion between different formats (8-bit, 16-bit, 32-bit)
- Support for signed, unsigned, and floating-point values
- Little-endian and big-endian byte order support
- Modern, responsive UI
- WebSocket-based real-time updates

## Prerequisites

- Node.js 18.x or later
- npm 9.x or later
- A CAN bus interface (currently using mock data for testing)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/can-sniffer.git
cd can-sniffer
```

2. Install dependencies:
```bash
npm install
```

## Usage

1. Start the application:
```bash
npm run server
```

This will start both the Next.js frontend and the WebSocket server.

2. Open your browser and navigate to:
```
http://localhost:3000
```

3. The application will display real-time CAN bus data in a table format. You can:
   - Select different data formats (8-bit, 16-bit, 32-bit)
   - Choose between signed and unsigned integers
   - Switch between little-endian and big-endian byte order
   - View raw data in hexadecimal format
   - See converted values based on your selected format

## Development

- Frontend code is in `src/app/`
- WebSocket server code is in `src/server/`
- Types are defined in `src/types/`
- Utility functions are in `src/utils/`

## Customizing for Your CAN Bus Interface

To use with a real CAN bus interface:

1. Modify the `CANBusInterface` class in `src/server/canServer.ts`
2. Replace the mock implementation with your actual CAN bus interface code
3. Ensure your interface provides data in the format specified by the `CANMessage` type

## License

MIT
#   c a n - s n i f f e r  
 