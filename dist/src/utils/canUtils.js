export function convertCANData(data, conversion) {
    var format = conversion.format, type = conversion.type, byteOrder = conversion.byteOrder;
    // Ensure we have enough bytes
    var requiredBytes = format === '32bit' ? 4 : format === '16bit' ? 2 : 1;
    if (data.length < requiredBytes) {
        throw new Error("Not enough bytes for ".concat(format, " conversion"));
    }
    // Get the bytes we need
    var bytes = data.slice(0, requiredBytes);
    // Convert to buffer for easier manipulation
    var buffer = new Uint8Array(bytes);
    // Convert based on format and type
    var value;
    if (format === '8bit') {
        value = type === 'signed' ?
            new Int8Array(buffer.buffer)[0] :
            buffer[0];
    }
    else if (format === '16bit') {
        var view = new DataView(buffer.buffer);
        value = type === 'signed' ?
            view.getInt16(0, byteOrder === 'little') :
            view.getUint16(0, byteOrder === 'little');
    }
    else { // 32bit
        var view = new DataView(buffer.buffer);
        if (type === 'float') {
            value = view.getFloat32(0, byteOrder === 'little');
        }
        else {
            value = type === 'signed' ?
                view.getInt32(0, byteOrder === 'little') :
                view.getUint32(0, byteOrder === 'little');
        }
    }
    return value;
}
export function formatTimestamp(timestamp) {
    return new Date(timestamp).toISOString();
}
export function formatCANId(id) {
    return "0x".concat(id.toString(16).toUpperCase().padStart(3, '0'));
}
export function parseCANMessage(message) {
    // This is a placeholder - implement actual CAN message parsing logic
    // based on your specific CAN bus interface
    return message.split(' ').map(function (byte) { return parseInt(byte, 16); });
}
