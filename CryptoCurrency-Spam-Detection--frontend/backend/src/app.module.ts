import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Modules
import { AddressesModule } from './modules/addresses/addresses.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { FlaggedAddressesModule } from './modules/flagged-addresses/flagged-addresses.module';
import { AddressRelationshipsModule } from './modules/address-relationships/address-relationships.module';
import { WatchlistModule } from './modules/watchlist/watchlist.module';
import { RiskScoringModule } from './modules/risk-scoring/risk-scoring.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { BatchModule } from './modules/batch/batch.module';
import { IngestModule } from './modules/ingest/ingest.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { TeamsModule } from './modules/teams/teams.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { MiscModule } from './modules/misc/misc.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST', 'localhost'),
        port: configService.get<number>('DATABASE_PORT', 5432),
        username: configService.get('DATABASE_USERNAME', 'postgres'),
        password: configService.get('DATABASE_PASSWORD', 'postgres'),
        database: configService.get('DATABASE_NAME', 'crypto_intelligence'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') === 'production' ? false : configService.get('TYPEORM_SYNCHRONIZE', 'true') === 'true',
        logging: false,
      }),
      inject: [ConfigService],
    }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD') || undefined,
        },
      } as any),
      inject: [ConfigService],
    }),

    AddressesModule,
    TransactionsModule,
    FlaggedAddressesModule,
    AddressRelationshipsModule,
    WatchlistModule,
    RiskScoringModule,
    MiscModule,
    WebhooksModule,
    BatchModule,
    IngestModule,
    AlertsModule,
    TeamsModule,
    ReportsModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }