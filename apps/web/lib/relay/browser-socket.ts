import type { RelaySocket } from './client';

/** Adapt DOM event signatures without casting the browser socket to our test interface. */
export function browserSocket(url: string): RelaySocket {
  const socket = new WebSocket(url);
  const connection: RelaySocket = {
    get readyState() { return socket.readyState; },
    get bufferedAmount() { return socket.bufferedAmount; },
    onopen: null, onmessage: null, onerror: null, onclose: null,
    send: data => socket.send(data), close: () => socket.close(),
  };
  socket.onopen = () => connection.onopen?.();
  socket.onmessage = event => connection.onmessage?.({ data: event.data });
  socket.onerror = () => connection.onerror?.();
  socket.onclose = () => connection.onclose?.();
  return connection;
}
