import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class EnhanceWatchlistMetadata1710000000009 implements MigrationInterface {
  name = 'EnhanceWatchlistMetadata1710000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('watchlist', [
      new TableColumn({ name: 'name', type: 'varchar', length: '128', isNullable: true }),
      new TableColumn({ name: 'category', type: 'varchar', length: '64', isNullable: true }),
      new TableColumn({ name: 'source', type: 'varchar', length: '128', isNullable: true }),
      new TableColumn({ name: 'confidence', type: 'decimal', precision: 5, scale: 2, default: 0 }),
      new TableColumn({ name: 'reviewer_notes', type: 'text', isNullable: true }),
      new TableColumn({ name: 'alerts_enabled', type: 'boolean', default: true }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns('watchlist', [
      'name',
      'category',
      'source',
      'confidence',
      'reviewer_notes',
      'alerts_enabled',
    ]);
  }
}
