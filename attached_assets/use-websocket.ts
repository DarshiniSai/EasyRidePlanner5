import { useState, useEffect, useRef, useCallback } from 'react';
import { ConstructionZone, TransportMode } from '@shared/schema';

interface WebSocketMessage {
  type: string;
  data: any;
}

interface TrafficUpdate {
  location: [number, number];
  severity: 'low' | 'medium' | 'high';
  description: string;
  timestamp: string;
}

interface WebSocketHookReturn {
  constructionZones: ConstructionZone[];
  trafficUpdates: TrafficUpdate[];
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  sendMessage: (message: object) => void;
  subscribeToArea: (center: [number, number], radius: number) => void;
  updateTransportMode: (mode: TransportMode) => void;
}

export function useWebSocket(): WebSocketHookReturn {
  const [constructionZones, setConstructionZones] = useState<ConstructionZone[]>([]);
  const [trafficUpdates, setTrafficUpdates] = useState<TrafficUpdate[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  const sendMessage = useCallback((message: object) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }, []);
  
  // Function to subscribe to a geographic area
  const subscribeToArea = useCallback((center: [number, number], radius: number) => {
    sendMessage({
      type: 'subscribe',
      area: {
        center,
        radius
      }
    });
  }, [sendMessage]);
  
  // Function to update transport mode
  const updateTransportMode = useCallback((mode: TransportMode) => {
    sendMessage({
      type: 'updateTransportMode',
      mode
    });
  }, [sendMessage]);

  // Function to setup WebSocket with reconnection capability
  const setupWebSocket = useCallback(() => {
    // Clear any existing reconnection timeout
    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Check if max reconnection attempts reached
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.log('Maximum reconnection attempts reached. Giving up.');
      setConnectionStatus('disconnected');
      return;
    }
    
    // Create WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;
    
    setConnectionStatus('connecting');
    
    // Connection opened
    socket.addEventListener('open', () => {
      console.log('WebSocket connection established');
      setConnectionStatus('connected');
      reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
      
      // Subscribe to updates
      sendMessage({
        type: 'subscribe',
        area: { radius: 10 } // 10km radius around the current view
      });
    });
    
    // Listen for messages
    socket.addEventListener('message', (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        switch (message.type) {
          case 'constructionZones':
            console.log('Received construction zones:', message.data);
            setConstructionZones(message.data);
            break;
            
          case 'trafficUpdate':
            console.log('Received traffic update:', message.data);
            setTrafficUpdates(prev => [message.data, ...prev].slice(0, 10)); // Keep last 10 updates
            break;
            
          case 'constructionUpdate':
            console.log('Received new construction zone:', message.data);
            // Add to zones, replacing if ID already exists
            setConstructionZones(prev => [
              ...prev.filter(z => z.id !== message.data.id),
              message.data
            ]);
            break;
            
          default:
            console.log('Received unhandled message type:', message.type);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });
    
    // Connection closed
    socket.addEventListener('close', (event) => {
      console.log(`WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason || 'No reason provided'}`);
      setConnectionStatus('disconnected');
      
      // Implement exponential backoff for reconnection
      const delay = Math.min(1000 * (2 ** reconnectAttemptsRef.current), 30000); // Cap at 30 seconds
      reconnectAttemptsRef.current++;
      
      console.log(`Attempting to reconnect in ${delay/1000} seconds... (Attempt ${reconnectAttemptsRef.current} of ${MAX_RECONNECT_ATTEMPTS})`);
      
      reconnectTimeoutRef.current = window.setTimeout(() => {
        setupWebSocket();
      }, delay);
    });
    
    // Connection error
    socket.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      // Let the onclose handler deal with reconnection
    });
  }, [sendMessage]);

  useEffect(() => {
    // Initialize WebSocket connection
    setupWebSocket();
    
    // Clean up on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [setupWebSocket]);
  
  return {
    constructionZones,
    trafficUpdates,
    connectionStatus,
    sendMessage,
    subscribeToArea,
    updateTransportMode
  };
}