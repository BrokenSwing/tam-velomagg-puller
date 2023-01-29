import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class StationStatus {
  @PrimaryColumn()
  updated_time: number;
  
  @PrimaryColumn()
  station_id: string;
  
  @Column()
  num_bikes_available: number;
  
  @Column()
  num_bikes_disabled: number;
  
  @Column()
  num_docks_available: number;
  
  @Column()
  is_installed: number;
  
  @Column()
  is_renting: number;
  
  @Column()
  is_returning: number;
  
  @Column()
  last_reported: number;
}
