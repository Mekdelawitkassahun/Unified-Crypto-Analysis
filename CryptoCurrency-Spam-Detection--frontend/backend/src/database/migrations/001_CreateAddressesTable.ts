import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAddressesTable1710000000001 implements MigrationInterface {
  name = 'CreateAddressesTable1710000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'addresses',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'address', type: 'varchar', length: '255' },
          { name: 'chain', type: 'enum', enum: ['ethereum', 'bitcoin', 'polygon', 'arbitrum', 'optimism', 'bsc', 'avalanche', 'solana'], default: "'ethereum'" },
          { name: 'first_seen', type: 'timestamp', isNullable: true },
          { name: 'last_checked', type: 'timestamp', isNullable: true },
          { name: 'risk_score', type: 'decimal', precision: 5, scale: 2, default: 0 },
          { name: 'balance', type: 'decimal', precision: 36, scale: 18, default: 0 },
          { name: 'total_received', type: 'decimal', precision: 36, scale: 18, default: 0 },
          { name: 'total_sent', type: 'decimal', precision: 36, scale: 18, default: 0 },
          { name: 'tx_count', type: 'int', default: 0 },
          { name: 'is_flagged', type: 'boolean', default: false },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'addresses',
      new TableIndex({ name: 'IDX_ADDRESS_CHAIN', columnNames: ['address', 'chain'], isUnique: true }),
    );
    await queryRunner.createIndex('addresses', new TableIndex({ name: 'IDX_ADDRESS', columnNames: ['address'] }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('addresses');
  }
}
