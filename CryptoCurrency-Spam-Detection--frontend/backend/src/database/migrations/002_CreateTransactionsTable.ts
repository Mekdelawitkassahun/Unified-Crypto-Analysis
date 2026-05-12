import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateTransactionsTable1710000000002 implements MigrationInterface {
  name = 'CreateTransactionsTable1710000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'transactions',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'tx_hash', type: 'varchar', length: '255' },
          { name: 'from_address', type: 'varchar', length: '255' },
          { name: 'to_address', type: 'varchar', length: '255' },
          { name: 'amount', type: 'decimal', precision: 36, scale: 18 },
          { name: 'timestamp', type: 'timestamp' },
          { name: 'chain', type: 'enum', enum: ['ethereum', 'bitcoin', 'polygon', 'arbitrum', 'optimism', 'bsc', 'avalanche', 'solana'], default: "'ethereum'" },
          { name: 'block_number', type: 'bigint', isNullable: true },
          { name: 'gas_price', type: 'decimal', precision: 36, scale: 18, isNullable: true },
          { name: 'gas_used', type: 'bigint', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'transactions',
      new TableIndex({ name: 'IDX_TX_HASH_CHAIN', columnNames: ['tx_hash', 'chain'], isUnique: true }),
    );
    await queryRunner.createIndex('transactions', new TableIndex({ name: 'IDX_FROM_ADDRESS', columnNames: ['from_address'] }));
    await queryRunner.createIndex('transactions', new TableIndex({ name: 'IDX_TO_ADDRESS', columnNames: ['to_address'] }));
    await queryRunner.createIndex('transactions', new TableIndex({ name: 'IDX_TX_TIMESTAMP', columnNames: ['timestamp'] }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('transactions');
  }
}
