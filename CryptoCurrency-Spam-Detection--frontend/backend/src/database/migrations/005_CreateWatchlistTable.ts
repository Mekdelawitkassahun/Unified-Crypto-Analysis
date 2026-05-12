import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateWatchlistTable1710000000005 implements MigrationInterface {
  name = 'CreateWatchlistTable1710000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'watchlist',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'address', type: 'varchar', length: '255' },
          { name: 'chain', type: 'enum', enum: ['ethereum', 'bitcoin', 'polygon', 'arbitrum', 'optimism', 'bsc', 'avalanche', 'solana'], default: "'ethereum'" },
          { name: 'user_id', type: 'uuid', isNullable: true },
          { name: 'alert_rules', type: 'jsonb', default: "'{}'" },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'watchlist',
      new TableIndex({ name: 'IDX_WATCHLIST_ADDRESS_CHAIN', columnNames: ['address', 'chain'], isUnique: true }),
    );
    await queryRunner.createIndex('watchlist', new TableIndex({ name: 'IDX_WATCHLIST_ADDRESS', columnNames: ['address'] }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('watchlist');
  }
}
