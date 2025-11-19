import type { Server } from 'socket.io';

export function setupAdminHandlers(io: Server): void {
  io.on('connection', (socket) => {
    socket.on('admin:join', () => {
      socket.join('admin');
      console.info(`Admin client connected: ${socket.id}`);
    });

    socket.on('admin:leave', () => {
      socket.leave('admin');
      console.info(`Admin client disconnected: ${socket.id}`);
    });
  });
}
