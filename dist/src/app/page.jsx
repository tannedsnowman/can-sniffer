'use client';
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { useState, useEffect } from 'react';
import { convertCANData, formatTimestamp, formatCANId } from '@/utils/canUtils';
export default function Home() {
    var _a = useState([]), messages = _a[0], setMessages = _a[1];
    var _b = useState({
        format: '32bit',
        type: 'unsigned',
        byteOrder: 'little'
    }), selectedFormat = _b[0], setSelectedFormat = _b[1];
    useEffect(function () {
        // WebSocket connection for real-time CAN data
        var ws = new WebSocket('ws://localhost:3001');
        ws.onmessage = function (event) {
            var message = JSON.parse(event.data);
            var parsedData = {
                raw: message.data,
                converted: {
                    value: convertCANData(message.data, selectedFormat)
                },
                timestamp: message.timestamp,
                id: message.id
            };
            setMessages(function (prev) { return __spreadArray([parsedData], prev, true).slice(0, 100); });
        };
        return function () { return ws.close(); };
    }, [selectedFormat]);
    return (<main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">CAN Bus Sniffer</h1>
        
        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Data Format</h2>
          <div className="grid grid-cols-3 gap-4">
            <select className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" value={selectedFormat.format} onChange={function (e) { return setSelectedFormat(function (prev) { return (__assign(__assign({}, prev), { format: e.target.value })); }); }}>
              <option value="8bit">8-bit</option>
              <option value="16bit">16-bit</option>
              <option value="32bit">32-bit</option>
            </select>
            
            <select className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" value={selectedFormat.type} onChange={function (e) { return setSelectedFormat(function (prev) { return (__assign(__assign({}, prev), { type: e.target.value })); }); }}>
              <option value="unsigned">Unsigned</option>
              <option value="signed">Signed</option>
              <option value="float">Float</option>
            </select>
            
            <select className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" value={selectedFormat.byteOrder} onChange={function (e) { return setSelectedFormat(function (prev) { return (__assign(__assign({}, prev), { byteOrder: e.target.value })); }); }}>
              <option value="little">Little Endian</option>
              <option value="big">Big Endian</option>
            </select>
          </div>
        </div>

        {/* Messages Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CAN ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Raw Data</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Converted Value</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {messages.map(function (msg, index) { return (<tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatTimestamp(msg.timestamp)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCANId(msg.id)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {msg.raw.map(function (b) { return b.toString(16).padStart(2, '0'); }).join(' ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {msg.converted.value}
                  </td>
                </tr>); })}
            </tbody>
          </table>
        </div>
      </div>
    </main>);
}
