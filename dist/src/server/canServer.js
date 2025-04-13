import { WebSocketServer } from 'ws';
// This is a mock implementation. Replace with actual CAN bus interface code
var CANBusInterface = /** @class */ (function () {
    function CANBusInterface() {
        this.interval = null;
    }
    CANBusInterface.prototype.startListening = function (callback) {
        // Mock CAN messages for testing
        this.interval = setInterval(function () {
            var mockMessage = {
                id: Math.floor(Math.random() * 0x7FF), // Standard CAN ID (11 bits)
                data: Array.from({ length: 8 }, function () { return Math.floor(Math.random() * 256); }),
                timestamp: Date.now(),
                dlc: 8
            };
            callback(mockMessage);
        }, 1000);
    };
    CANBusInterface.prototype.stopListening = function () {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    };
    return CANBusInterface;
}());
export function startCANServer(port) {
    if (port === void 0) { port = 3001; }
    var wss = new WebSocketServer({ port: port });
    var canInterface = new CANBusInterface();
    wss.on('connection', function (ws) {
        console.log('Client connected');
        canInterface.startListening(function (message) {
            if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify(message));
            }
        });
        ws.on('close', function () {
            console.log('Client disconnected');
            canInterface.stopListening();
        });
    });
    console.log("CAN WebSocket server started on port ".concat(port));
    return wss;
}
