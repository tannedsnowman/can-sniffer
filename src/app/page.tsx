'use client';

import { useState, useEffect, useRef } from 'react';
import { CANMessage, ParsedCANData, CANDeviceConfig } from '@/types/can';
import { formatTimestamp, formatCANId, interpretData, formatValue } from '@/utils/canUtils';
import { getBestDataFormat } from '@/utils/dataFormatDetector';

export default function Home() {
  const [messages, setMessages] = useState<ParsedCANData[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<ParsedCANData | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [deviceConfig, setDeviceConfig] = useState<CANDeviceConfig>({
    type: 'mock'
  });
  const [availablePorts, setAvailablePorts] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const messageQueueRef = useRef<ParsedCANData[]>([]);

  // Fetch available serial ports
  const fetchAvailablePorts = async () => {
    try {
      const response = await fetch('http://localhost:3002/ports');
      if (response.ok) {
        const ports = await response.json();
        setAvailablePorts(ports);
      }
    } catch (error) {
      console.error('Error fetching serial ports:', error);
    }
  };

  useEffect(() => {
    // Fetch available ports on component mount
    fetchAvailablePorts();
    
    // WebSocket connection for real-time CAN data
    const ws = new WebSocket('ws://localhost:3002');
    wsRef.current = ws;
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setError(null);
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'can_message') {
        const message: CANMessage = data.message;
        const parsedData: ParsedCANData = {
          raw: message.data,
          timestamp: message.timestamp,
          id: message.id,
          selected: false
        };
        
        if (isPaused) {
          // Store message in queue when paused
          messageQueueRef.current.push(parsedData);
        } else {
          setMessages(prev => [parsedData, ...prev].slice(0, 1000));
        }
      } else if (data.type === 'config') {
        // Update device config from server
        setDeviceConfig(data.config);
        console.log('Received config from server:', data.config);
      } else if (data.type === 'config_ack') {
        // Acknowledge configuration change
        console.log('Configuration change acknowledged:', data.success);
      } else if (data.type === 'error') {
        setError(data.message);
      } else if (data.type === 'ports') {
        // Update available ports
        setAvailablePorts(data.ports);
        console.log('Available ports updated:', data.ports);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Connection error. Please check if the server is running.');
      setIsConnected(false);
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    return () => {
      if (ws.readyState === ws.OPEN) {
        ws.close();
      }
    };
  }, [isPaused]);

  // Handle device configuration change
  const handleDeviceConfigChange = (newConfig: CANDeviceConfig) => {
    console.log('Sending new config to server:', newConfig);
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'config',
        config: newConfig
      }));
      setDeviceConfig(newConfig);
    } else {
      console.error('WebSocket is not open, cannot send configuration');
      setError('Connection error. Cannot send configuration to server.');
    }
  };

  const handleResume = () => {
    setIsPaused(false);
    // Process queued messages
    if (messageQueueRef.current.length > 0) {
      setMessages(prev => [...messageQueueRef.current.reverse(), ...prev].slice(0, 1000));
      messageQueueRef.current = [];
    }
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const clearMessages = () => {
    setMessages([]);
    messageQueueRef.current = [];
  };

  // Serial Port Settings Modal
  const [showSerialSettings, setShowSerialSettings] = useState(false);
  const [serialSettings, setSerialSettings] = useState({
    baudRate: 115200,
    dataBits: 8,
    stopBits: 1,
    parity: 'none'
  });

  // Handle serial port connection with settings
  const handleSerialPortChange = (port: string) => {
    const newConfig: CANDeviceConfig = {
      type: 'serial',
      serialPort: {
        port,
        baudRate: serialSettings.baudRate,
        dataBits: serialSettings.dataBits,
        stopBits: serialSettings.stopBits,
        parity: serialSettings.parity
      }
    };
    handleDeviceConfigChange(newConfig);
    setShowSerialSettings(false);
  };

  // Handle device type change
  const handleDeviceTypeChange = (type: 'mock' | 'serial') => {
    console.log('Changing device type to:', type);
    
    if (type === 'mock') {
      // Switch to mock data
      const newConfig: CANDeviceConfig = { type: 'mock' };
      handleDeviceConfigChange(newConfig);
    } else if (type === 'serial') {
      // Switch to serial port mode
      if (availablePorts.length > 0) {
        // If we have ports available, connect to the first one
        handleSerialPortChange(availablePorts[0]);
      } else {
        // Just switch to serial mode without connecting to a port
        const newConfig: CANDeviceConfig = { type: 'serial' };
        handleDeviceConfigChange(newConfig);
      }
    }
  };

  // Refresh available ports
  const handleRefreshPorts = () => {
    fetchAvailablePorts();
  };

  const handleMessageSelect = (message: ParsedCANData) => {
    if (selectedMessage?.id === message.id && selectedMessage?.timestamp === message.timestamp) {
      setSelectedMessage(null);
    } else {
      setSelectedMessage({
        ...message,
        interpretations: interpretData(message.raw)
      });
    }
  };

  return (
    <main className="min-h-screen bg-gray-100 p-8 flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">CAN Bus Sniffer</h1>
        
        {/* Connection Status with Stream Controls */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={clearMessages}
                className="px-3 py-1 text-xs rounded-md bg-red-100 text-red-700 hover:bg-red-200"
              >
                Clear Messages
              </button>
              <button
                onClick={isPaused ? handleResume : handlePause}
                className={`px-3 py-1 text-xs rounded-md ${
                  isPaused 
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                }`}
              >
                {isPaused ? 'Resume' : 'Pause'} Stream
              </button>
              {isPaused && messageQueueRef.current.length > 0 && (
                <span className="text-xs text-gray-500">
                  {messageQueueRef.current.length} messages queued
                </span>
              )}
            </div>
            {error && <span className="text-sm text-red-500">{error}</span>}
          </div>
        </div>
        
        {/* Device Selection */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Data Source</h2>
          
          {/* Data Source Selection */}
          <div className="mb-6">
            <div className="flex space-x-4">
              <button
                onClick={() => handleDeviceTypeChange('mock')}
                className={`px-4 py-2 rounded-md font-medium ${
                  deviceConfig.type === 'mock'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Mock Data
              </button>
              <button
                onClick={() => handleDeviceTypeChange('serial')}
                className={`px-4 py-2 rounded-md font-medium ${
                  deviceConfig.type === 'serial'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Serial Port
              </button>
            </div>
          </div>
          
          {/* Mock Data Info */}
          {deviceConfig.type === 'mock' && (
            <div className="bg-blue-50 p-4 rounded-md">
              <p className="text-sm text-blue-700">
                Mock data is being generated for testing purposes. You should see random CAN messages appearing in the table below.
              </p>
            </div>
          )}
          
          {/* Serial Port Selection */}
          {deviceConfig.type === 'serial' && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">Available Serial Ports</label>
                <button 
                  onClick={handleRefreshPorts}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Refresh
                </button>
              </div>
              <div className="space-y-2">
                {availablePorts.length > 0 ? (
                  availablePorts.map(port => (
                    <div key={port} className="flex items-center justify-between">
                      <span className="text-sm">{port}</span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setShowSerialSettings(true)}
                          className="px-3 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                        >
                          Settings
                        </button>
                        <button
                          onClick={() => handleSerialPortChange(port)}
                          className={`px-3 py-1 text-xs rounded-md ${
                            deviceConfig.serialPort?.port === port
                              ? 'bg-green-500 text-white'
                              : 'bg-blue-500 text-white hover:bg-blue-600'
                          }`}
                        >
                          {deviceConfig.serialPort?.port === port ? 'Connected' : 'Connect'}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No serial ports available</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Serial Settings Modal */}
        {showSerialSettings && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 w-96">
              <h3 className="text-lg font-medium mb-4">Serial Port Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Baud Rate</label>
                  <select
                    value={serialSettings.baudRate}
                    onChange={(e) => setSerialSettings(prev => ({ ...prev, baudRate: parseInt(e.target.value) }))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    {[9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600].map(rate => (
                      <option key={rate} value={rate}>{rate}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Bits</label>
                  <select
                    value={serialSettings.dataBits}
                    onChange={(e) => setSerialSettings(prev => ({ ...prev, dataBits: parseInt(e.target.value) }))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    {[7, 8].map(bits => (
                      <option key={bits} value={bits}>{bits}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stop Bits</label>
                  <select
                    value={serialSettings.stopBits}
                    onChange={(e) => setSerialSettings(prev => ({ ...prev, stopBits: parseInt(e.target.value) }))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    {[1, 2].map(bits => (
                      <option key={bits} value={bits}>{bits}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Parity</label>
                  <select
                    value={serialSettings.parity}
                    onChange={(e) => setSerialSettings(prev => ({ ...prev, parity: e.target.value }))}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="none">None</option>
                    <option value="even">Even</option>
                    <option value="odd">Odd</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowSerialSettings(false)}
                  className="px-4 py-2 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowSerialSettings(false)}
                  className="px-4 py-2 text-sm rounded-md bg-blue-500 text-white hover:bg-blue-600"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Messages Table and Details Split View */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Messages Table - scrollable */}
          <div className="flex-1 bg-white rounded-lg shadow-md overflow-hidden mb-4">
            <div className="overflow-auto max-h-[calc(100vh-600px)]">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CAN ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Raw Data (Hex)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {messages.map((msg) => (
                    <tr 
                      key={`${msg.id}-${msg.timestamp}`} 
                      className={`hover:bg-gray-50 ${
                        selectedMessage?.id === msg.id && selectedMessage?.timestamp === msg.timestamp 
                          ? 'bg-blue-50' 
                          : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTimestamp(msg.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCANId(msg.id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {msg.raw.map(b => b.toString(16).padStart(2, '0')).join(' ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => handleMessageSelect(msg)}
                          className={`px-3 py-1 rounded-md text-xs ${
                            selectedMessage?.id === msg.id && selectedMessage?.timestamp === msg.timestamp
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {selectedMessage?.id === msg.id && selectedMessage?.timestamp === msg.timestamp ? 'Selected' : 'Select'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fixed Details Pane */}
          <div className="h-[300px] bg-white rounded-lg shadow-md p-6 overflow-auto">
            {selectedMessage && selectedMessage.interpretations ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">
                    Selected Frame: {formatCANId(selectedMessage.id)} at {formatTimestamp(selectedMessage.timestamp)}
                  </h3>
                  <button
                    onClick={() => setSelectedMessage(null)}
                    className="px-3 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    Clear Selection
                  </button>
                </div>

                {/* Individual Bytes */}
                <div>
                  <h4 className="font-medium mb-2">Individual Bytes</h4>
                  <div className="grid grid-cols-8 gap-4">
                    {selectedMessage.interpretations.bytes.map((byte, i) => (
                      <div key={i} className="space-y-1">
                        <p className="text-xs text-gray-500">Byte {i}</p>
                        <p className="font-mono text-sm">0x{byte.hex}</p>
                        <p className="text-sm">{byte.decimal}</p>
                        <p className="font-mono text-xs">{byte.binary}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 16-bit Interpretations */}
                <div>
                  <h4 className="font-medium mb-2">16-bit Values (Little Endian)</h4>
                  <div className="grid grid-cols-4 gap-4">
                    {selectedMessage.interpretations.pairs.map((pair, i) => (
                      <div key={i} className="space-y-1">
                        <p className="text-xs text-gray-500">Bytes {i*2}-{i*2+1}</p>
                        <p className="font-mono text-sm">0x{pair.hex}</p>
                        <p className="text-sm">Signed: {formatValue(pair.signed)}</p>
                        <p className="text-sm">Unsigned: {formatValue(pair.unsigned)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 32-bit Interpretations */}
                <div>
                  <h4 className="font-medium mb-2">32-bit Values (Little Endian)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedMessage.interpretations.quads.map((quad, i) => (
                      <div key={i} className="space-y-1">
                        <p className="text-xs text-gray-500">Bytes {i*4}-{i*4+3}</p>
                        <p className="font-mono text-sm">0x{quad.hex}</p>
                        <p className="text-sm">Signed: {formatValue(quad.signed)}</p>
                        <p className="text-sm">Unsigned: {formatValue(quad.unsigned)}</p>
                        <p className="text-sm">Float: {formatValue(quad.float)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                Select a CAN frame to view detailed interpretations
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
