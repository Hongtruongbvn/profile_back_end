import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Kích hoạt CORS (Cross-Origin Resource Sharing)
  app.enableCors({
    // Cho phép cổng mặc định của Vite (http://localhost:5173) truy cập vào API
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173','https://profile-front-end-xi.vercel.app','https://profile-front-end-chi.vercel.app'], 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Backend is running on: ${await app.getUrl()}`);
}
bootstrap();
