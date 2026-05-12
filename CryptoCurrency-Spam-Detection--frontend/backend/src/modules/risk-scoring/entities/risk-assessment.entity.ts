import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { Chain } from '../../../shared/enums/chain.enum';

@Entity('risk_assessments')
@Index(['address', 'chain', 'createdAt'])
export class RiskAssessment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  address: string;

  @Column({
    type: 'enum',
    enum: Chain,
    default: Chain.ETHEREUM,
  })
  chain: Chain;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  score: number;

  @Column({ type: 'varchar', length: 32 })
  level: string;

  @Column({ type: 'jsonb', default: [] })
  factors: Array<{ factor: string; points: number; description: string }>;

  @Column({ type: 'varchar', length: 512, nullable: true })
  recommendation?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
