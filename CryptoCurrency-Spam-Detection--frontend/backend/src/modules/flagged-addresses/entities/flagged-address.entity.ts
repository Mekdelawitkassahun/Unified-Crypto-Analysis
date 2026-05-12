import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Chain } from '../../../shared/enums/chain.enum';

@Entity('flagged_addresses')
@Index(['address', 'chain'], { unique: true })
export class FlaggedAddress {
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

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  source: string;

  @Column({ type: 'int', name: 'hop_distance', default: 1 })
  hopDistance: number;

  @CreateDateColumn({ name: 'added_at' })
  addedAt: Date;
}
