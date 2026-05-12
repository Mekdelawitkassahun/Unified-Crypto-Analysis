import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server } from 'ws';

@WebSocketGateway({
  path: '/ws',
})
export class AlertsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('AlertsGateway');

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleDisconnect(client: any) {
    this.logger.log(`Client disconnected`);
  }

  handleConnection(client: any, ...args: any[]) {
    this.logger.log(`Client connected`);
  }

  sendAlert(alert: any) {
    if (!this.server) return;
    this.server.clients.forEach((client: any) => {
      if (client.readyState === 1) { // 1 = OPEN
        client.send(JSON.stringify(alert));
      }
    });
  }
}
