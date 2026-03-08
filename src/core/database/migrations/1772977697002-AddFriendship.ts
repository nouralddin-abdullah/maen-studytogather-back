import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFriendship1772977697002 implements MigrationInterface {
    name = 'AddFriendship1772977697002'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "friendship" DROP CONSTRAINT "FK_e8a1f15f614d577cded58c58ee0"`);
        await queryRunner.query(`ALTER TABLE "friendship" DROP CONSTRAINT "FK_1ce7870ad7e93284a3f186811f1"`);
        await queryRunner.query(`ALTER TABLE "friendship" DROP CONSTRAINT "UQ_deeac293b04038701bca2a02779"`);
        await queryRunner.query(`ALTER TABLE "friendship" DROP COLUMN "senderId"`);
        await queryRunner.query(`ALTER TABLE "friendship" DROP COLUMN "receiverId"`);
        await queryRunner.query(`ALTER TABLE "friendship" ADD "requesterId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "friendship" ADD "addresseeId" uuid NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_48a37dcc1431c47e2d92b2f404" ON "friendship" ("requesterId", "addresseeId") `);
        await queryRunner.query(`ALTER TABLE "friendship" ADD CONSTRAINT "FK_b29f15b88ee36453605ade63cb2" FOREIGN KEY ("requesterId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "friendship" ADD CONSTRAINT "FK_8012340b570c83b55e0d3ef829a" FOREIGN KEY ("addresseeId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "friendship" DROP CONSTRAINT "FK_8012340b570c83b55e0d3ef829a"`);
        await queryRunner.query(`ALTER TABLE "friendship" DROP CONSTRAINT "FK_b29f15b88ee36453605ade63cb2"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_48a37dcc1431c47e2d92b2f404"`);
        await queryRunner.query(`ALTER TABLE "friendship" DROP COLUMN "addresseeId"`);
        await queryRunner.query(`ALTER TABLE "friendship" DROP COLUMN "requesterId"`);
        await queryRunner.query(`ALTER TABLE "friendship" ADD "receiverId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "friendship" ADD "senderId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "friendship" ADD CONSTRAINT "UQ_deeac293b04038701bca2a02779" UNIQUE ("senderId", "receiverId")`);
        await queryRunner.query(`ALTER TABLE "friendship" ADD CONSTRAINT "FK_1ce7870ad7e93284a3f186811f1" FOREIGN KEY ("receiverId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "friendship" ADD CONSTRAINT "FK_e8a1f15f614d577cded58c58ee0" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
