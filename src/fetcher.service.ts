import { HttpService } from '@nestjs/axios/dist';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { map, forkJoin, mergeMap, from } from 'rxjs';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { StationStatus } from './entities/station-status.entity';
import { StationInformation } from './entities/station-information.entity';

interface GBFS {
  last_updated: number;
  ttl: number;
  data: {
    en: {
      feeds: {
        name: 'system_information' | 'station_information' | 'station_status';
        url: string;
      }[];
    };
  };
}

interface StationsInformation {
  last_updated: number;
  ttl: number;
  data: {
    stations: {
      station_id: string;
      name: string;
      lat: number;
      lon: number;
      capacity: number;
    }[];
  };
}

interface StationsStatuses {
  last_updated: number;
  ttl: number;
  data: {
    stations: {
      station_id: string;
      num_bikes_available: number;
      num_bikes_disabled: number;
      num_docks_available: number;
      is_installed: number;
      is_renting: number;
      is_returning: number;
      last_reported: number;
    }[];
  };
}

function findFeed(
  gbfs: GBFS,
  feedName: GBFS['data']['en']['feeds'][number]['name'],
): GBFS['data']['en']['feeds'][number] {
  return gbfs.data.en.feeds.find((feed) => feed.name == feedName);
}

@Injectable()
export class FetcherService {
  private readonly logger = new Logger(FetcherService.name);

  /**
   * This URL is the stable URL that can be found on the https://data.gouv.fr for the velomagg dataset.
   * https://www.data.gouv.fr/fr/datasets/disponibilite-en-temps-reel-des-velos-en-libre-service-velomagg-de-montpellier/
   *
   * It actually redirects to the URL https://montpellier-fr-smoove.klervi.net/gbfs/gbfs.json
   * at the moment I'm writing this code.
   * As we're provided a stable URL, it is prefered to use it.
   */
  private readonly DATASET_URL =
    'https://www.data.gouv.fr/fr/datasets/r/732c582d-8815-4892-98fd-4446b7ba13d5';

  constructor(
    private readonly http: HttpService,
    @InjectRepository(StationStatus)
    private readonly statusRepository: Repository<StationStatus>,
    @InjectRepository(StationInformation)
    private readonly informationRepository: Repository<StationInformation>,
  ) {}

  @Cron(CronExpression.EVERY_SECOND)
  async fetchData() {
    this.logger.log('Starting to fetch the data ...');
    this.http
      .get<GBFS>(this.DATASET_URL)
      .pipe(
        /** Retrieve the URL of the two feeds that we're interested into */
        map((resp) => ({
          stationsStatuses: findFeed(resp.data, 'station_status'),
          stationsInformation: findFeed(resp.data, 'station_information'),
        })),
        /** Create a new observable that will pull the data from the two URLs retrieve before */
        mergeMap((urls) =>
          forkJoin([
            this.http
              .get<StationsInformation>(urls.stationsInformation.url)
              /** Store the retrieve data in the database */
              .pipe(
                map((resp) => from(this.storeStationsInformation(resp.data))),
              ),
            this.http
              .get<StationsStatuses>(urls.stationsStatuses.url)
              /** Store the retrieve data in the database */
              .pipe(map((resp) => from(this.storeStationsStatuses(resp.data)))),
          ]),
        ),
      )
      .subscribe({
        complete: () => this.logger.log('Successfully fetched the data'),
        error: (err) => {
          this.logger.error('Error while fetching the data.');
          this.logger.error(err);
        },
      });
  }

  private async storeStationsStatuses(data: StationsStatuses) {
    const entities = data.data.stations.map((station) =>
      this.statusRepository.create({
        ...station,
        updated_time: data.last_updated,
      }),
    );
    try {
      await this.statusRepository.save(entities);
      this.logger.log(`Saved ${entities.length} stations statuses`);
    } catch (err) {
      this.logger.error('Unable to save stations statuses');
      this.logger.error(err);
    }
  }

  private async storeStationsInformation(data: StationsInformation) {
    const entities = data.data.stations.map((station) =>
      this.informationRepository.create({
        ...station,
        updated_time: data.last_updated,
      }),
    );
    try {
      await this.informationRepository.save(entities);
      this.logger.log(`Saved ${entities.length} stations information`);
    } catch (err) {
      this.logger.error('Unable to save stations information');
      this.logger.error(err);
    }
  }
}
