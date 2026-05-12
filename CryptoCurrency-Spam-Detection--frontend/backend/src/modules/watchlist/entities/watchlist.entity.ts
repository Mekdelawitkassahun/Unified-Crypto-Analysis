import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Chain } from '../../../shared/enums/chain.enum';

@Entity('watchlist')
@Index(['address', 'chain'], { unique: true })
export class Watchlist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  address: string;

  @Column({
    type: 'enum',
    enum: Chain,
    default: Chain.ETHEREUM,
  })
  chain: Chain;

  @Column({ type: 'uuid', nullable: true })
  userId: string;

  @Column({ type: 'jsonb', default: {} })
  alertRules: {
    minAmount?: number;
    flaggedInteraction?: boolean;
    velocityThreshold?: number;
    notifyOnNewTx?: boolean;
  };

  @Column({ type: 'varchar', length: 128, nullable: true })
  name?: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  category?: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  source?: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  confidence: number;

  @Column({ type: 'text', nullable: true })
  reviewerNotes?: string;

  @Column({ type: 'boolean', default: true })
  alerts_enabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
