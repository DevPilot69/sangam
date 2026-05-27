import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { raw } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';
import {
  buildCorsOriginConfig,
  createCorsOriginDelegate,
} from './config/cors.util';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  const configService = app.get(ConfigService);
  const corsConfig = buildCorsOriginConfig({
    FRONTEND_URL:
      configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000',
    CORS_EXTRA_ORIGINS: configService.get<string>('CORS_EXTRA_ORIGINS'),
    NODE_ENV: configService.get<string>('NODE_ENV') ?? 'development',
  });

  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());
  app.use(
    '/v1/billing/webhooks/razorpay',
    raw({ type: 'application/json' }),
  );
  app.enableCors({
    origin: createCorsOriginDelegate(corsConfig),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.setGlobalPrefix('v1', { exclude: ['health'] });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Vetan API')
    .setDescription('Payroll management SaaS — Phase 8–9 foundation')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = Number(process.env.PORT) || 4000;
  await app.listen(port);

  console.log(
    `Vetan API listening on http://localhost:${port}/v1 (docs: /api/docs)`,
  );
}
void bootstrap();
