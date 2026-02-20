import { DataSource, DataSourceOptions } from 'typeorm';
import { secrets } from '../config/secrets';

// database configuration for migrations
// this file is used by TypeORM CLI for running migrations
export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: secrets.db.host,
  port: secrets.db.port,
  username: secrets.db.username,
  password: secrets.db.password,
  database: secrets.db.database,
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/core/database/migrations/*.js'],
  synchronize: false, // always false - use migrations instead
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
