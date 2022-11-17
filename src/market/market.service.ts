import { Injectable } from '@nestjs/common';
import { OrderDto } from './dto/order.dto';
import signalR from 'signalr-client';
import zlib from 'zlib';
import { createHmac } from 'crypto';
import uuid from 'uuid';

@Injectable()
export class MarketService {
  url = 'wss://socket-v3.bittrex.com/signalr';
  hub = ['c3'];
  resolveInvocationPromise: (value: unknown) => void;
  client;

  getTipsOrderbook(orderDto: OrderDto) {
    return this.main(process.env.SECRET_KEY, [orderDto.pairName]);
  }

  findAll() {
    return `This action returns all market`;
  }

  async main(apisecret, pairName) {
    const client = await this.connect();
    if (apisecret) {
      await this.authenticate(client);
    } else {
      console.log('Authentication skipped because API key was not provided');
    }
    await this.subscribe(client, pairName);
  }

  async connect() {
    return new Promise((resolve) => {
      const client = new signalR.client(this.url, this.hub);
      client.serviceHandlers.messageReceived = this.messageReceived;
      client.serviceHandlers.connected = () => {
        console.log('Connected');
        return resolve(client);
      };
    });
  }

  async subscribe(client, channel) {
    const response = await this.invoke(client, 'subscribe', channel);
    for (let i = 0; i < channel.length; i++) {
      if (response[i]['Success']) {
        console.log('Subscription to "' + channel[i] + '" successful');
      } else {
        console.log(
          'Subscription to "' +
            channel[i] +
            '" failed: ' +
            response[i]['ErrorCode'],
        );
      }
    }
    return response;
  }

  async authenticate(client) {
    const timestamp = new Date().getTime();
    const randomContent = uuid.v4();
    const content = `${timestamp}${randomContent}`;
    const signedContent = createHmac('sha512', process.env.SECRET_KEY)
      .update(content)
      .digest('hex')
      .toUpperCase();

    const response = await this.invoke(
      client,
      'authenticate',
      process.env.API_KEY,
      timestamp,
      randomContent,
      signedContent,
    );
    if (response['Success']) {
      console.log('Authenticated');
    } else {
      console.log('Authentication failed: ' + response['ErrorCode']);
    }
  }

  messageReceived(message) {
    const data = JSON.parse(message.utf8Data);
    if (data['R']) {
      this.resolveInvocationPromise(data.R);
    } else if (data['M']) {
      data.M.forEach(function (m) {
        if (m['A']) {
          if (m.A[0]) {
            const b64 = m.A[0];
            const raw = Buffer.from(b64, 'base64');
            zlib.inflateRaw(raw, function (err, inflated) {
              if (!err) {
                const json = JSON.parse(inflated.toString('utf8'));
                console.log(m.M + ': ');
                console.log(json);
              }
            });
          } else if (m.M == 'heartbeat') {
            console.log('\u2661');
          } else if (m.M == 'authenticationExpiring') {
            console.log('Authentication expiring...');
            this.authenticate(this.client);
          }
        }
      });
    }
  }

  async invoke(client, method, ...args) {
    return new Promise((resolve, reject) => {
      this.resolveInvocationPromise = resolve; // Promise will be resolved when response message received

      client.call(this.hub[0], method, ...args).done((err) => {
        if (err) {
          return reject(err);
        }
      });
    });
  }
}
