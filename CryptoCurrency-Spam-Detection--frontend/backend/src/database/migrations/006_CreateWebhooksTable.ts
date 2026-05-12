import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateWebhooksTable1710000000006 implements MigrationInterface {
  name = 'CreateWebhooksTable1710000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'webhooks',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'uuid_generate_v4()' },
          { name: 'url', type: 'varchar', length: '500' },
          { name: 'events', type: 'text', default: "''" },
          { name: 'is_active', type: 'boolean', default: true },
          { name: 'failure_count', type: 'int', default: 0 },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('webhooks');
  }
}