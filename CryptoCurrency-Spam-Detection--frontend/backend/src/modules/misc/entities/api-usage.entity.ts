import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('api_usage')
export class ApiUsage {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ type: 'varchar', length: 64 })
    @Index()
    keyId!: string;

    @Column({ type: 'varchar', length: 10 })
    @Index()
    day!: string; // YYYY-MM-DD

    @Column({ type: 'int', default: 0 })
    calls!: number;

    @CreateDateColumn()
    createdAt!: Date;
}
