import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async chat(@Body('message') message: string) {
    if (!message || message.trim() === '') {
      return {
        reply: 'Vui lòng nhập câu hỏi của bạn.',
      };
    }
    
    const reply = await this.chatService.askGemini(message);
    return { reply };
  }
}