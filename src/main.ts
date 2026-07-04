import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder } from '@nestjs/swagger';
import { SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Kaku Yaku API')
    .setDescription('Kaku Yaku API description')
    .setVersion('1.0')
    .addTag('kaku-yaku')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  app.use('/api/vocab/import', express.text({ type: ['text/csv', 'text/plain'] }));
  app.setGlobalPrefix('api');

  await app.listen(process.env.PORT ? parseInt(process.env.PORT) : 3002);
}
bootstrap();
