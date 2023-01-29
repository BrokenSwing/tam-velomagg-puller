import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class StationInformation {
  @PrimaryColumn()
  updated_time: number;

  @PrimaryColumn()
  station_id: string;

  @Column()
  name: string;

  @Column({ type: 'decimal' })
  lat: number;

  @Column({ type: 'decimal' })
  lon: number;

  @Column()
  capacity: number;
}
