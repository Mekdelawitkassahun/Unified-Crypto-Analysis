import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('team_activity')
export class TeamActivityEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  teamId!: string;

  @Column({ type: 'varchar' })
  actor!: string;

  @Column({ type: 'varchar' })
  action!: string;

  @CreateDateColumn()
  createdAt!: Date;
}