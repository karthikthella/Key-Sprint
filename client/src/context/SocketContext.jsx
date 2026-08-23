import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

const SOCKET_SERVER_URL = 'http://localhost:5000';

export function SocketProvider({ children }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [socketId, setSocketId] = useState('');

  useEffect(() => {
    const s = io(SOCKET_SERVER_URL, {
      auth: token ? { token } : {}
    });

    s.on('connect', () => {
      setConnected(true);
      setSocketId(s.id);
    });

    s.on('disconnect', () => {
      setConnected(false);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket, connected, socketId }}>
      {children}
    </SocketContext.Provider>
  );
}
