import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertLogEntity } from './entities/alert-log.entity';
import { TelegramService } from './telegram.service';

@Module({
  imports: [TypeOrmModule.forFeature([AlertLogEntity])],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class AlertsModule {}
