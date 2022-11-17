import { Module } from '@nestjs/common';
import { MarketService } from './market.service';
import { MarketGateway } from './market.gateway';

@Module({
  providers: [MarketGateway, MarketService],
})
export class MarketModule {}
