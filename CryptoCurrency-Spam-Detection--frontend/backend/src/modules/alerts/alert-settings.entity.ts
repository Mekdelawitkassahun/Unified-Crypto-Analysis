import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('alert_settings')
export class AlertSettingsEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', nullable: true })
  userId!: string;

  @Column({ type: 'jsonb', nullable: true, default: {} })
  telegram!: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true, default: {} })
  discord!: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true, default: {} })
  email!: Record<string, string>;

  @Column({ type: 'jsonb', nullable: true, default: {} })
  rules!: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}