import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type AlertStatus = 'sent' | 'skipped' | 'failed';

@Entity({ name: 'alert_logs' })
export class AlertLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'analysis_run_id', type: 'uuid', nullable: true })
  analysisRunId!: string | null;

  @Column({ type: 'varchar', length: 24 })
  channel!: string;

  @Column({ type: 'varchar', length: 16 })
  status!: AlertStatus;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'text', nullable: true })
  error!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
