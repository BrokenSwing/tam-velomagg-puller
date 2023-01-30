import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { StationInformation } from './entities/station-information.entity';
import { StationStatus } from './entities/station-status.entity';
import * as dayjs from 'dayjs';
import { stringify } from 'csv-stringify';
import { Octokit } from 'octokit';
import { Stream } from 'stream';

@Injectable()
export class DailyExport {
  private readonly logger = new Logger(DailyExport.name);

  constructor(
    @InjectRepository(StationStatus)
    private readonly statusRepository: Repository<StationStatus>,
    @InjectRepository(StationInformation)
    private readonly informationRepository: Repository<StationInformation>,
    @Inject('OCTOKIT') private readonly octokit: Octokit,
  ) {}

  /**
   * We're uploading the data daily on Github as a CSV file.
   * We'll have 2 CSV files per day (1 for status and 1 for information), given that:
   * - we pull the data every second
   * - there is 3600 * 24 = 86 400 seconds in a day
   * - atm the number of stations is 56
   * Each of our files should contain 56 * 86 400 lines, which is ~5M lines
   *
   * As we'll store the data as CSV files, we can calculate the average file size for a
   * day of data.
   *
   * For statuses, each row is ~37 bytes, which makes files of around 185 MB
   * For information, each row is ~70 bytes (it is more versatile as we have the station name) which
   * makes files of around 350 MB
   *
   * Note on Cron:
   * - We add 1 hour of delay to be sure we're not messing up with the timezones (France is GMT+1),
   *   that way "yesterday" is correct whether GMT or GMT+1 is used
   * - We add 1 minute of delay to be sure all data is inserted
   */
  @Cron('1 1 * * *')
  async exportData() {
    const current = dayjs();
    const yesterday = current.subtract(1, 'day');
    const lowerBoundDate = yesterday.startOf('day').unix();
    const upperBoundDate = yesterday.endOf('day').unix();

    const information = await this.informationRepository.find({
      where: {
        updated_time: Between(lowerBoundDate, upperBoundDate),
      },
      order: {
        updated_time: 'ASC',
        station_id: 'ASC',
      },
    });
    await this.pushToGithub(information, 'stations_information', yesterday);

    const statuses = await this.statusRepository.find({
      where: {
        updated_time: Between(lowerBoundDate, upperBoundDate),
      },
      order: {
        updated_time: 'ASC',
        station_id: 'ASC',
      },
    });
    await this.pushToGithub(statuses, 'stations_statuses', yesterday);

    this.logger.log('Data successfully sent to Github');
  }

  private async pushToGithub(
    entities: StationInformation[] | StationStatus[],
    dirname: string,
    dataDay: dayjs.Dayjs,
  ): Promise<void> {
    const stringifier = stringify(entities, {
      delimiter: ',',
      header: true,
    });
    const fileContent = await this.streamToBase64(stringifier);

    const csvFileName = `dataset/${dirname}/${dataDay.format(
      'DD-MM-YYYY',
    )}.csv`;

    await this.octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
      owner: 'BrokenSwing',
      repo: 'tam-velomagg-dataset',
      path: csvFileName,
      message: `chore: add ${csvFileName}`,
      content: fileContent,
    });
  }

  private streamToBase64(stream: Stream): Promise<string> {
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', (err) => reject(err));
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
    });
  }
}
