import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateFlaggedAddressesTable1710000000003 implements MigrationInterface {
  name = 'CreateFlaggedAddressesTable1710000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'flagged_addresses',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'address', type: 'varchar', length: '255' },
          { name: 'chain', type: 'enum', enum: ['ethereum', 'bitcoin', 'polygon', 'arbitrum', 'optimism', 'bsc', 'avalanche', 'solana'], default: "'ethereum'" },
          { name: 'reason', type: 'text' },
          { name: 'source', type: 'varchar', length: '100', isNullable: true },
          { name: 'hop_distance', type: 'int', default: 1 },
          { name: 'added_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'flagged_addresses',
      new TableIndex({ name: 'IDX_FLAGGED_ADDRESS_CHAIN', columnNames: ['address', 'chain'], isUnique: true }),
    );
    await queryRunner.createIndex('flagged_addresses', new TableIndex({ name: 'IDX_FLAGGED_ADDRESS', columnNames: ['address'] }));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('flagged_addresses');
  }
}
