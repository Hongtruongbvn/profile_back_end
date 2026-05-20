import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Qna, QnaDocument } from './schema/qna.schema';

@Injectable()
export class QnaService {
  constructor(@InjectModel(Qna.name) private qnaModel: Model<QnaDocument>) {}

  // Lấy toàn bộ danh sách QnA để sau này nạp vào Gemini
  async findAll(): Promise<Qna[]> {
    return this.qnaModel.find().exec();
  }

  // Thêm một câu hỏi/câu trả lời mới vào database
  async create(createQnaDto: { question: string; answer: string }): Promise<Qna> {
    const createdQna = new this.qnaModel(createQnaDto);
    return createdQna.save();
  }

  // Tìm kiếm theo từ khóa (tùy chọn, dùng khi cần)
  async search(keyword: string): Promise<Qna[]> {
    return this.qnaModel.find({
      question: { $regex: keyword, $options: 'i' } // Tìm kiếm không phân biệt hoa thường
    }).exec();
  }
}