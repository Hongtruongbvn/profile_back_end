import { Controller, Get, Post, Body } from '@nestjs/common';
import { QnaService } from './qna.service';

@Controller('qna')
export class QnaController {
  constructor(private readonly qnaService: QnaService) {}

  // API: GET /qna - Lấy danh sách câu hỏi
  @Get()
  async getAllQna() {
    return this.qnaService.findAll();
  }

  // API: POST /qna - Thêm câu hỏi mới
  // Body truyền lên dạng JSON: { "question": "...", "answer": "..." }
  @Post()
  async createQna(@Body() body: { question: string; answer: string }) {
    if (!body.question || !body.answer) {
      return { message: 'Vui lòng cung cấp cả question và answer' };
    }
    return this.qnaService.create(body);
  }
}