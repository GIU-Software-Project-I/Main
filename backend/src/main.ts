import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { join } from 'path';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';


async function bootstrap() {

    const app = await NestFactory.create(AppModule);

    // Debug Logger
    app.use((req, res, next) => {
        console.log(`Incoming Request: ${req.method} ${req.url}`);
        next();
    });

    app.use(cookieParser());

    app.useGlobalPipes(new ValidationPipe({ whitelist: false, transform: true }));

    app.enableCors({
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true);
            // Allow any localhost origin during development
            if (origin.includes('http://192.168.21.1:8000')) {
                return callback(null, true);
            }
            callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    });

    const config = new DocumentBuilder()
        .setTitle('HR System API')
        .setDescription('API documentation — limited to safe public models (no secrets).')
        .setVersion('1.0')
        .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header', }, 'access-token',).build();

    const document = SwaggerModule.createDocument(app, config, {});

    SwaggerModule.setup('api', app, document);

    const port = Number(process.env.PORT) || 9000;

    await app.listen(port);

    console.log(`Application running on http://localhost:${port}`);

    console.log(`Swagger running on http://localhost:${port}/api`);
}
bootstrap()


