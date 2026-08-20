import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { AuditService } from './common/audit.service';

async function bootstrap() {
  // Disable Nest's default body parser so we can enforce strict size limits.
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.enableShutdownHooks();

  // ── Hardened HTTP security headers ────────────────────────────
  // API responses are JSON; disable helmet's CSP (the browser app enforces its
  // own) but keep HSTS, nosniff, frameguard, referrer policy, etc.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'same-site' },
      hsts:
        process.env.NODE_ENV === 'production'
          ? { maxAge: 31536000, includeSubDomains: true, preload: true }
          : false,
    }),
  );

  // Remove framework fingerprinting.
  const expressInstance = app.getHttpAdapter().getInstance();
  expressInstance.disable('x-powered-by');
  // Required behind a managed load balancer so request IPs and throttling are
  // based on the real client. Keep the hop count explicit to prevent spoofing.
  expressInstance.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1));

  // ── Strict request body size limits (DoS protection) ──────────
  app.use(json({
    limit: '64kb',
    verify: (req: any, _res, buffer) => { req.rawBody = Buffer.from(buffer); },
  }));
  app.use(urlencoded({ extended: true, limit: '64kb' }));

  // Sensitive API data must never be cached by browsers/proxies.
  app.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    next();
  });

  // Enable CORS for frontend — restricted to known origins
  const allowedOrigins = (
    process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:3001'
  )
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    maxAge: 600,
  });

  // Global Validation Pipe — reject unknown/oversized/malformed input.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global safety net — catch every error, log 5xx, never crash or leak stacks.
  app.useGlobalFilters(new AllExceptionsFilter(app.get(AuditService)));

  // Auto-recover from truly unexpected process-level faults: log, don't die.
  process.on('unhandledRejection', (reason) => {
    console.error('[unhandledRejection]', reason);
  });
  process.on('uncaughtException', (err) => {
    console.error('[uncaughtException]', err);
  });

  // Swagger Documentation Setup — disabled in production
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Poltica SaaS Platform API')
      .setDescription('Multi-tenant SaaS API documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(process.env.PORT ?? 3001);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
