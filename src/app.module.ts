import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TextAnalysisModule } from './modules/text-analysis/text-analysis.module';
import { DictionaryModule } from './modules/dictionary/dictionary.module';
import { GrammarModule } from './modules/grammar/grammar.module';
import { LlmModule } from './modules/llm/llm.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RawModule } from './modules/raw/raw.module';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        '.env',
        '.env.development.local',
        '.env.production.local',
        '.env.test.local',
      ],
    }),
    TextAnalysisModule,
    DictionaryModule,
    GrammarModule,
    LlmModule,
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.getOrThrow('DB_HOST'),
        port: configService.getOrThrow('DB_PORT'),
        username: configService.getOrThrow('DB_USERNAME'),
        password: configService.getOrThrow('DB_PASSWORD'),
        database: configService.getOrThrow('DB_DATABASE'),
        entities: [join(__dirname, '**', '*.entity.{ts,js}')],
        autoLoadEntities: true,
        synchronize: configService.getOrThrow('DB_SYNC') === 'true',
        logging: configService.getOrThrow('DB_LOGGING') === 'true',
        migrations: [join(__dirname, 'migrations', '*.ts')],
      }),
      inject: [ConfigService],
    }),
    RawModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
