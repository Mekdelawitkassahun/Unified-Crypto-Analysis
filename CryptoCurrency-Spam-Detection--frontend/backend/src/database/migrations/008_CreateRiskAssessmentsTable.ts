import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateRiskAssessmentsTable1710000000008 implements MigrationInterface {
  name = 'CreateRiskAssessmentsTable1710000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'risk_assessments',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'address', type: 'varchar', length: '255' },
          { name: 'chain', type: 'enum', enum: ['ethereum', 'bitcoin', 'polygon', 'arbitrum', 'optimism', 'bsc', 'avalanche', 'solana'], default: "'ethereum'" },
          { name: 'score', type: 'decimal', precision: 5, scale: 2, default: 0 },
          { name: 'level', type: 'varchar', length: '32' },
          { name: 'factors', type: 'jsonb', default: "'[]'" },
          { name: 'recommendation', type: 'varchar', length: '512', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'risk_assessments',
      new TableIndex({
        name: 'IDX_RISK_ADDRESS_CHAIN_CREATED',
        columnNames: ['address', 'chain', 'created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('risk_assessments');
  }
}
