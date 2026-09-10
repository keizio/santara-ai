import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type {
  AgentTrace,
  CompanyRef,
  FlowReport,
  FundamentalsReport,
  JudgeVerdict,
  OwnershipReport,
  Recommendation,
} from '@santara/shared';

@Entity({ name: 'analysis_runs' })
@Index(['ticker', 'createdAt'])
export class AnalysisRunEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 12 })
  ticker!: string;

  @Column({ type: 'text', nullable: true })
  query!: string | null;

  @Column({ type: 'varchar', length: 24 })
  recommendation!: Recommendation;

  @Column({ type: 'int' })
  score!: number;

  @Column({ type: 'numeric', precision: 4, scale: 3 })
  confidence!: string;

  @Column({ name: 'used_fixtures', type: 'boolean', default: false })
  usedFixtures!: boolean;

  @Column({ type: 'jsonb' })
  company!: CompanyRef;

  @Column({ type: 'jsonb', nullable: true })
  ownership!: OwnershipReport | null;

  @Column({ type: 'jsonb', nullable: true })
  flows!: FlowReport | null;

  @Column({ type: 'jsonb', nullable: true })
  fundamentals!: FundamentalsReport | null;

  @Column({ type: 'jsonb' })
  verdict!: JudgeVerdict;

  @Column({ type: 'jsonb' })
  traces!: AgentTrace[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
