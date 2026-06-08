import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      'https://profile.truongbvn.online',
    'https://profile-front-end-three.vercel.app',
      
    ],
    credentials: true,
    methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin'
    ],
  });

  await app.listen(process.env.PORT ?? 3000);

  console.log(
    `Backend is running on: ${await app.getUrl()}`
  );
}

bootstrap();
