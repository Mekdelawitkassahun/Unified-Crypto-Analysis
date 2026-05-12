import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

export type ApiKeyPermission = 'read' | 'write' | 'admin';
export type ApiKeyTier = 'free' | 'pro' | 'enterprise';

@Entity('api_keys')
export class ApiKey {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 128 })
    name!: string;

    @Column({ type: 'varchar', length: 64, unique: true })
    @Index()
    key!: string;

    @Column({ type: 'varchar', length: 16, default: 'read' })
    permissions!: ApiKeyPermission;

    @Column({ type: 'varchar', length: 16, default: 'free' })
    tier!: ApiKeyTier;

    @Column({ type: 'boolean', default: true })
    isActive!: boolean;

    @Column({ type: 'timestamptz', nullable: true })
    expiresAt?: Date;

    @Column({ type: 'timestamptz', nullable: true })
    lastUsedAt?: Date;

    @Column({ type: 'int', default: 0 })
    callCount!: number;

    @Column({ type: 'varchar', length: 64, nullable: true })
    userId?: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
