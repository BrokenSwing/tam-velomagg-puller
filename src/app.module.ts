import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config/dist';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StationInformation } from './entities/station-information.entity';
import { StationStatus } from './entities/station-status.entity';
import { FetcherService } from './fetcher.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    HttpModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL'),
        synchronize: true,
        entities: [StationStatus, StationInformation],
      }),
    }),
    TypeOrmModule.forFeature([StationStatus, StationInformation]),
  ],
  providers: [FetcherService],
})
export class AppModule {}
