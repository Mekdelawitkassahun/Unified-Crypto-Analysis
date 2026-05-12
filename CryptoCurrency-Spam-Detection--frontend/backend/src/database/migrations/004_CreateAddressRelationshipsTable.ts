import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateAddressRelationshipsTable1710000000004 implements MigrationInterface {
  name = 'CreateAddressRelationshipsTable1710000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'address_relationships',
        columns: [
          { name: 'from_address', type: 'varchar', length: '255', isPrimary: true },
          { name: 'to_address', type: 'varchar', length: '255', isPrimary: true },
          { name: 'tx_hash', type: 'varchar', length: '255', isPrimary: true },
          { name: 'amount', type: 'decimal', precision: 36, scale: 18 },
          { name: 'hop_distance', type: 'int', default: 1 },
          { name: 'chain', type: 'enum', enum: ['ethereum', 'bitcoin', 'polygon', 'arbitrum', 'optimism', 'bsc', 'avalanche', 'solana'], default: "'ethereum'" },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'address_relationships',
      new TableIndex({
        name: 'IDX_REL_FROM_TO',
        columnNames: ['from_address', 'to_address'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('address_relationships');
  }
}
