import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddForgetPassword1768635741572 implements MigrationInterface {
  name = 'AddForgetPassword1768635741572';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "passwordResetToken" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "passwordResetExpired" TIMESTAMP`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "passwordResetExpired"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" DROP COLUMN "passwordResetToken"`,
    );
  }
}
