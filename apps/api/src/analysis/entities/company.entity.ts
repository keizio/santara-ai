import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import type { Exchange } from '@santara/shared';

@Entity({ name: 'companies' })
export class CompanyEntity {
  @PrimaryColumn({ type: 'varchar', length: 12 })
  ticker!: string;

  @Column({ type: 'varchar', length: 160 })
  name!: string;

  @Column({ type: 'varchar', length: 8 })
  exchange!: Exchange;

  @Column({ name: 'sub_sector', type: 'varchar', length: 80 })
  subSector!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  conglomerate!: string | null;

  @Column({
    name: 'market_cap',
    type: 'numeric',
    precision: 24,
    scale: 2,
    nullable: true,
  })
  marketCap!: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
