import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QnaController } from './qna.controller';
import { QnaService } from './qna.service';
import { Qna, QnaSchema } from './schema/qna.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Qna.name, schema: QnaSchema }])
  ],
  controllers: [QnaController],
  providers: [QnaService],
  exports: [QnaService], // Export service này ra để sau này ChatModule (gọi Gemini) có thể dùng
})
export class QnaModule {}