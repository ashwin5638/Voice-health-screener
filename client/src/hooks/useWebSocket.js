import { useCallback, useEffect, useRef, useState } from 'react';

export function useWebSocket({ onMessage } = {}) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const handlersRef = useRef(onMessage);
  handlersRef.current = onMessage;

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsBase = import.meta.env.VITE_WS_URL || `${protocol}//${window.location.host}`;
    const url = `${wsBase}/ws`;
    let ws;
    try { ws = new WebSocket(url); } catch (e) { setError(e.message); return; }
    wsRef.current = ws;
    ws.onopen = () => { setReady(true); setError(null); };
    ws.onclose = () => {
      setReady(false);
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = setTimeout(() => {
        if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) connect();
      }, 2500);
    };
    ws.onerror = () => setError('WebSocket connection error');
    ws.onmessage = (event) => {
      try { const data = JSON.parse(event.data); handlersRef.current?.(data); }
      catch (err) { console.error('[WS] Parse error:', err); }
    };
  }, []);

  const send = useCallback((payload) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload)); return true;
    }
    return false;
  }, []);

  const close = useCallback(() => {
    clearTimeout(reconnectTimer.current);
    if (wsRef.current) { wsRef.current.onclose = null; try { wsRef.current.close(); } catch {} wsRef.current = null; }
    setReady(false);
  }, []);

  useEffect(() => { connect(); return () => close(); /* eslint-disable-next-line */ }, []);
  return { ready, error, send, close };
}
