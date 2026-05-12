import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { AlertsGateway } from './alerts.gateway';
import { AlertSettingsEntity } from './alert-settings.entity';
import { AlertEntity } from './alert.entity';
import { AlertsProcessor } from './alerts.processor';
import { EmailService } from './email.service';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { RiskScoringModule } from '../risk-scoring/risk-scoring.module';
import { MiscModule } from '../misc/misc.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AlertSettingsEntity, AlertEntity]),
    BullModule.registerQueue({ name: 'alerts' }),
    WebhooksModule,
    RiskScoringModule,
    MiscModule,
  ],
  controllers: [AlertsController],
  providers: [AlertsService, AlertsProcessor, AlertsGateway, EmailService],
  exports: [AlertsService, AlertsGateway, EmailService, TypeOrmModule],
})
export class AlertsModule { }
