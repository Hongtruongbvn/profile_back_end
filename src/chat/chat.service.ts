import { Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { QnaService } from '../qna/qna.service';
import { GoogleGenAI } from '@google/genai';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import pdf = require('pdf-parse');

@Injectable()
export class ChatService implements OnModuleInit {
  private ai: GoogleGenAI;
  private cvTextContent: string = '';
  private cvFileName = 'CV_PhamHongTruong.pdf';

  private readonly MODEL_PREFERENCE = [
    'gemini-2.0-flash', 
    'gemini-1.5-flash',
    'gemini-2.5-flash'
  ];

  constructor(
    private readonly qnaService: QnaService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY') || '';
    this.ai = new GoogleGenAI({ apiKey });
  }

  async onModuleInit() {
    await this.loadCVContent();
  }

  private async loadCVContent() {
    try {
      const cvPath = path.join(__dirname, '..', '..', 'public', this.cvFileName);
      if (fs.existsSync(cvPath)) {
        const dataBuffer = fs.readFileSync(cvPath);
        const parsedPdf = await pdf(dataBuffer);
        this.cvTextContent = parsedPdf.text;
        console.log(`[CV Loader] Đã tải và trích xuất thành công dữ liệu từ file: ${this.cvFileName}`);
      } else {
        console.warn(`[CV Loader] Không tìm thấy file CV tại đường dẫn: ${cvPath}`);
        this.cvTextContent = 'Chưa cập nhật file CV PDF của Phạm Hồng Trưởng.';
      }
    } catch (error) {
      console.error('[CV Loader] Lỗi khi trích xuất nội dung file PDF CV:', error);
      this.cvTextContent = '';
    }
  }

  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // HÀM TỰ CỨU HỘ: Tự động quét từ khóa trả lời khi Google sập hoàn toàn
  private handleLocalFallback(userQuestion: string): string {
    const lower = userQuestion.toLowerCase().trim();
    const downloadUrl = `http://localhost:3000/public/${this.cvFileName}`;

    // 1. KIỂM TRA TÍNH LIÊN QUAN (Bộ lọc câu hỏi ngoài luồng)
    const relatedKeywords = [
      'trưởng', 'truong', 'cv', 'hồ sơ', 'ho so', 'kinh nghiệm', 'kinh nghiem', 
      'làm việc', 'lam viec', 'dự án', 'du an', 'project', 'kỹ năng', 'ky nang', 
      'nestjs', 'react', 'fullstack', 'liên hệ', 'lien he', 'bạn', 'cậu', 'ai', 
      'tải', 'download', 'email', 'sđt', 'phone', 'portfolio', 'học vấn', 'hoc van'
    ];

    const isRelated = relatedKeywords.some(keyword => lower.includes(keyword));

    // Nếu câu hỏi hoàn toàn không liên quan đến bạn hay portfolio của bạn
    if (!isRelated) {
      return `Xin lỗi bạn, câu hỏi này nằm ngoài phạm vi giải đáp của trợ lý ảo Phạm Hồng Trưởng. Tớ chỉ hỗ trợ cung cấp thông tin liên quan đến kỹ năng, kinh nghiệm, học vấn và các dự án công nghệ của anh Trưởng thôi nhé!`;
    }

    // 2. XỬ LÝ CÁC CÂU HỎI LIÊN QUAN KHI GOOGLE SẬP
    if (lower.includes('cv') || lower.includes('hồ sơ') || lower.includes('tải') || lower.includes('download') || lower.includes('xin file')) {
      return `Hiện tại hệ thống AI của Google đang quá tải, nhưng tớ đã kích hoạt chế độ tự động phục vụ! Bạn có thể tải trực tiếp file CV bản mềm của anh Phạm Hồng Trưởng tại đây nhé: ${downloadUrl}`;
    }
    
    if (lower.includes('kinh nghiệm') || lower.includes('làm việc') || lower.includes('công ty')) {
      return `Hệ thống AI đang tạm thời gián đoạn, tuy nhiên theo thông tin trích xuất nhanh từ CV: Anh Trưởng có kinh nghiệm chuyên sâu về Fullstack Web Development (NestJS, React). Để xem chi tiết các công ty và mốc thời gian, bạn có thể tải CV trực tiếp tại đây: ${downloadUrl}`;
    }

    if (lower.includes('dự án') || lower.includes('sản phẩm') || lower.includes('project')) {
      return `Do kết nối AI đang bận, tớ xin tóm tắt nhanh: Anh Trưởng đã phát triển nhiều dự án Web bao gồm hệ thống CMS, website portfolio, và các ứng dụng kết hợp NestJS + MongoDB. Bạn hãy tải CV để xem chi tiết kiến trúc dự án nhé: ${downloadUrl}`;
    }

    return `Xin lỗi bạn, hiện tại máy chủ AI của Google đang bị quá tải trên toàn cầu. Trợ lý ảo chưa thể phân tích sâu câu hỏi "${userQuestion}" của bạn lúc này. Bạn có thể thử lại sau vài giây hoặc tải trực tiếp hồ sơ CV PDF của anh Trưởng tại đây để xem nhanh thông tin: ${downloadUrl}`;
  }

  async askGemini(userQuestion: string): Promise<string> {
    try {
      const qnaList = await this.qnaService.findAll();
      const qnaKnowledge = qnaList
        .map((item, index) => `${index + 1}. Hỏi: "${item.question}" -> Trả lời: "${item.answer}"`)
        .join('\n');

      const systemInstruction = `
Bạn là một trợ lý ảo thông minh của Phạm Hồng Trưởng.
Nhiệm vụ của bạn là trả lời các câu hỏi của khách truy cập dựa trên thông tin CV và cơ sở dữ liệu.

ĐÂY LÀ NỘI DUNG TRỰC TIẾP TỪ FILE CV PDF CỦA PHẠM HỒNG TRƯỞNG:
=== BẮT ĐẦU CV ===
${this.cvTextContent}
=== KẾT THÚC CV ===

ĐÂY LÀ CÁC THÔNG TIN BỔ SUNG KHÁC TỪ CƠ SỞ DỮ LIỆU (MONGODB):
${qnaKnowledge || 'Không có dữ liệu bổ sung.'}

ĐƯỜNG DẪN TẢI CV TRỰC TIẾP (BẮT BUỘC DÙNG LINK NÀY KHI KHÁCH XIN CV):
Link tải trực tiếp: http://localhost:3000/public/${this.cvFileName}

QUY TẮC PHẢN HỒI QUAN TRỌNG:
1. Khi khách truy cập hỏi xin CV, muốn xem hồ sơ, hoặc muốn tải file, bạn BẮT BUỘC phải gửi kèm đường dẫn tải trực tiếp ở trên một cách rõ ràng và đẹp mắt dưới định dạng văn bản (ví dụ: "Bạn có thể tải CV trực tiếp của anh Trưởng tại đây: http://localhost:3000/public/${this.cvFileName}").
2. Sử dụng toàn bộ thông tin từ CV PDF trên để trả lời các câu hỏi chi tiết về dự án, học vấn, công nghệ, kinh nghiệm làm việc của Trưởng một cách tự tin, chuẩn xác.
3. Nếu người dùng hỏi các câu hỏi nằm ngoài luồng hoặc không liên quan đến Phạm Hồng Trưởng (ví dụ: yêu cầu viết mã nguồn trang web, kể chuyện, giải toán hay các câu hỏi không liên quan khác), hãy lịch sự từ chối và hướng người dùng quay lại đặt câu hỏi về Trưởng.
4. Xưng hô: Sử dụng xưng hô thân thiện như "mình", "tớ", hoặc "trợ lý của anh Trưởng" và gọi đối tác là "bạn".
`;

      // Vòng lặp gọi API Google
      for (const modelName of this.MODEL_PREFERENCE) {
        let delay = 1000;
        const maxRetries = 2;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            console.log(`[AI Request] Model: ${modelName} | Attempt: ${attempt}/${maxRetries}`);
            const response = await this.ai.models.generateContent({
              model: modelName,
              contents: userQuestion,
              config: { systemInstruction, temperature: 0.2 },
            });

            if (response && response.text) {
              return response.text;
            }
          } catch (error: any) {
            if ((error?.status === 503 || error?.status === 429) && attempt < maxRetries) {
              console.warn(`[AI Warning] ${modelName} đang bận. Retry sau ${delay}ms...`);
              await this.sleep(delay);
              delay *= 1.5;
              continue;
            }
            break; 
          }
        }
      }

      // NẾU TẤT CẢ MODEL ĐỀU SẬP -> KÍCH HOẠT CHẾ ĐỘ TỰ CỨU HỘ LOCAL
      console.warn('[AI Local Fallback] Đang kích hoạt chế độ phản hồi cục bộ do Google sập hệ thống...');
      return this.handleLocalFallback(userQuestion);

    } catch (error) {
      console.error('[Chat Service Error]', error);
      // Đảm bảo luôn trả về chuỗi văn bản an toàn cho Frontend, không ném exception làm sập app nữa
      return `Hệ thống đang bận xử lý dữ liệu. Bạn có thể tải trực tiếp file hồ sơ CV tại đây để tham khảo: http://localhost:3000/public/${this.cvFileName}`;
    }
  }
}