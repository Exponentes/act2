import { io } from 'socket.io-client';

// Detecta automáticamente la IP de la máquina host en la red local
const URL = `http://${window.location.hostname}:3001`; 
export const socket = io(URL, {
  autoConnect: false
});
