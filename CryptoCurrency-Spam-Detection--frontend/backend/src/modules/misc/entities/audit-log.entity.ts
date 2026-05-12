import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  @Index()
  actor!: string;

  @Column({ type: 'varchar', length: 120 })
  @Index()
  action!: string;

  @Column({ type: 'varchar', length: 255 })
  resource!: string;

  @Column({ type: 'jsonb', nullable: true, default: {} })
  meta!: Record<string, unknown>;

  @CreateDateColumn()
  @Index()
  createdAt!: Date;
}
