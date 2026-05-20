import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { QnaModule } from '../qna/qna.module'; // Import QnaModule để sử dụng QnaService

@Module({
  imports: [QnaModule], // Cho phép ChatModule sử dụng QnaService và QnaModel
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}