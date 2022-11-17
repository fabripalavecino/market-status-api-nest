import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
} from '@nestjs/websockets';
import { MarketService } from './market.service';
import { OrderDto } from './dto/order.dto';
import { Logger } from '@nestjs/common';
import { Server } from 'socket.io';

@WebSocketGateway()
export class MarketGateway {
  constructor(private readonly marketService: MarketService) {}
  @WebSocketServer()
  server: Server;
  private logger: Logger = new Logger('MarketGateway');

  @SubscribeMessage('orderBook')
  async getTipsOrderbook(@MessageBody() orderDto: OrderDto) {
    const response = await this.marketService.getTipsOrderbook(orderDto);
    this.server.emit('OnSubscribe', {
      response,
    });
  }

  @SubscribeMessage('findAllMarket')
  findAll() {
    return this.marketService.findAll();
  }
}
