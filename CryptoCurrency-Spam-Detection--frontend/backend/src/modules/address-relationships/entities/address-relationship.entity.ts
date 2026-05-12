import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';
import { Chain } from '../../../shared/enums/chain.enum';

@Entity('address_relationships')
@Index(['fromAddress', 'toAddress', 'chain'])
export class AddressRelationship {
  @PrimaryColumn({ type: 'varchar', length: 255 })
  fromAddress: string;

  @PrimaryColumn({ type: 'varchar', length: 255 })
  toAddress: string;

  @PrimaryColumn({ type: 'varchar', length: 255 })
  txHash: string;

  @Column({ type: 'decimal', precision: 36, scale: 18 })
  amount: number;

  @Column({ type: 'int', default: 1 })
  hopDistance: number;

  @Column({
    type: 'enum',
    enum: Chain,
    default: Chain.ETHEREUM,
  })
  chain: Chain;

  @CreateDateColumn()
  createdAt: Date;
}
