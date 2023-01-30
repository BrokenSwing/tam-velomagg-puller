import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config/dist';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DailyExport } from './daily-export.service';
import { StationInformation } from './entities/station-information.entity';
import { StationStatus } from './entities/station-status.entity';
import { FetcherService } from './fetcher.service';
import { Octokit } from 'octokit';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'local.env'], // So we can use local.env file to store the GITHUB_TOKEN and gitignore it
    }),
    ScheduleModule.forRoot(),
    HttpModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow('DATABASE_URL'),
        synchronize: true,
        entities: [StationStatus, StationInformation],
      }),
    }),
    TypeOrmModule.forFeature([StationStatus, StationInformation]),
  ],
  providers: [
    FetcherService,
    {
      provide: 'OCTOKIT',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        new Octokit({
          auth: configService.getOrThrow('GITHUB_TOKEN'),
        }),
    },
    DailyExport,
  ],
})
export class AppModule {}
