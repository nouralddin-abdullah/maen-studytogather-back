import { DynamicModule, Module, Provider } from '@nestjs/common';
import { StorageService } from './services/storage.service';
import {
  STORAGE_CONFIG,
  STORAGE_PROVIDER,
  StorageProviderType,
} from './constants/storage.constants';
import {
  StorageConfig,
  StorageModuleAsyncOptions,
} from './interfaces/storage-config.interface';
import { IStorageProvider } from './interfaces/storage-provider.interface';
import { S3Provider } from './providers/s3.provider';
import { R2Provider } from './providers/r2.provider';

/**
 * Storage feature module
 * Provides file storage capabilities using S3 or R2
 *
 * @example
 * // Sync registration
 * StorageModule.forRoot({
 *   provider: StorageProviderType.S3,
 *   region: 'us-east-1',
 *   accessKeyId: 'your-access-key',
 *   secretAccessKey: 'your-secret-key',
 *   bucket: 'your-bucket',
 *   isGlobal: true,
 * })
 *
 * @example
 * // Async registration with ConfigService
 * StorageModule.forRootAsync({
 *   imports: [ConfigModule],
 *   useFactory: (configService: ConfigService) => ({
 *     provider: configService.get('STORAGE_PROVIDER'),
 *     region: configService.get('AWS_REGION'),
 *     // ...
 *   }),
 *   inject: [ConfigService],
 *   isGlobal: true,
 * })
 */
@Module({})
export class StorageModule {
  /**
   * Register the storage module with static configuration
   * @param config Storage configuration with optional isGlobal flag
   */
  static forRoot(
    config: StorageConfig & { isGlobal?: boolean },
  ): DynamicModule {
    const { isGlobal = false, ...storageConfig } = config;

    const configProvider: Provider = {
      provide: STORAGE_CONFIG,
      useValue: storageConfig,
    };

    const storageProvider: Provider = {
      provide: STORAGE_PROVIDER,
      useFactory: (cfg: StorageConfig): IStorageProvider => {
        return StorageModule.createProvider(cfg);
      },
      inject: [STORAGE_CONFIG],
    };

    return {
      module: StorageModule,
      global: isGlobal,
      providers: [configProvider, storageProvider, StorageService],
      exports: [StorageService, STORAGE_PROVIDER],
    };
  }

  /**
   * Register the storage module with async configuration
   * Useful for loading config from ConfigService or other async sources
   * @param options Async module options
   */
  static forRootAsync(options: StorageModuleAsyncOptions): DynamicModule {
    const configProvider: Provider = {
      provide: STORAGE_CONFIG,
      useFactory: options.useFactory,
      inject: options.inject || [],
    };

    const storageProvider: Provider = {
      provide: STORAGE_PROVIDER,
      useFactory: (config: StorageConfig): IStorageProvider => {
        return StorageModule.createProvider(config);
      },
      inject: [STORAGE_CONFIG],
    };

    return {
      module: StorageModule,
      global: options.isGlobal ?? false,
      imports: options.imports || [],
      providers: [configProvider, storageProvider, StorageService],
      exports: [StorageService, STORAGE_PROVIDER],
    };
  }

  /**
   * Create the appropriate storage provider based on configuration
   * @param config Storage configuration
   * @returns The storage provider instance
   */
  private static createProvider(config: StorageConfig): IStorageProvider {
    switch (config.provider) {
      case StorageProviderType.S3:
        return new S3Provider(config);
      case StorageProviderType.R2:
        return new R2Provider(config);
      default:
        throw new Error(`Unknown storage provider: ${config.provider}`);
    }
  }
}
