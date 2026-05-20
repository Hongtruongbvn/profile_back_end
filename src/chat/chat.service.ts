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

  // HÀM TỰ CỨU HỘ: Phân tích cực kỳ chi tiết dựa trên thông tin thực tế của Trưởng khi API Google sập
  private handleLocalFallback(userQuestion: string): string {
    const lower = userQuestion.toLowerCase().trim();
    const downloadUrl = `http://localhost:3000/public/${this.cvFileName}`;

    // 1. KIỂM TRA TÍNH LIÊN QUAN
    const relatedKeywords = [
      'trưởng', 'truong', 'cv', 'hồ sơ', 'ho so', 'kinh nghiệm', 'kinh nghiem', 
      'làm việc', 'lam viec', 'dự án', 'du an', 'project', 'kỹ năng', 'ky nang', 
      'nestjs', 'react', 'fullstack', 'liên hệ', 'lien he', 'bạn', 'cậu', 'ai', 
      'tải', 'download', 'email', 'sđt', 'phone', 'portfolio', 'học vấn', 'hoc van',
      'mầm non', 'mam non', 'social', 'mạng xã hội', 'bus', 'ticket', 'vé xe', 'vtc', 'laravel'
    ];

    const isRelated = relatedKeywords.some(keyword => lower.includes(keyword));

    if (!isRelated) {
      return `Xin lỗi bạn, câu hỏi này nằm ngoài phạm vi giải đáp của trợ lý ảo Phạm Hồng Trưởng. Tớ chỉ hỗ trợ cung cấp thông tin liên quan đến kỹ năng, kinh nghiệm, học vấn (VTC Academy) và 3 dự án tiêu biểu (Kindergarten, Social Network, Bus Ticket) của anh Trưởng thôi nhé!`;
    }

    // 2. PHÂN TÍCH TRẢ LỜI CHO TỪNG NHÓM CHỦ ĐỀ CỤ THỂ KHI OFFLINE
    
    // Dự án 1: Trường mầm non
    if (lower.includes('mầm non') || lower.includes('mam non') || lower.includes('kindergarten')) {
      return `### Dự án: Kindergarten Management (Quản lý trường mầm non) (11/2024 - 01/2025)
- **Vai trò:** Team Leader, thiết kế cơ sở dữ liệu, viết controllers và xử lý business logic; đồng thời hỗ trợ phát triển Frontend.
- **Giới thiệu:** Hệ thống quản lý trường mầm non giúp tối ưu hóa việc quản lý lịch học, cơ sở vật chất, giáo viên và học sinh; tích hợp camera giám sát và thanh toán học phí online nhằm giảm thiểu giấy tờ và các cuộc họp phụ huynh.
- **Công nghệ:** Laravel, MySQL.
- **Liên kết thực tế:**
  * GitHub Repository: https://github.com/Hongtruongbvn/quan_ly_truong_mam_non
  * Link Demo (Deploy): https://quan-ly-truong-mam-non.onrender.com/
- **Tài khoản dùng thử (Demo Accounts):**
  * **Admin:** SĐT: \`0987654321\` | Mật khẩu: \`12345678\`
  * **Giáo viên (Teacher):** Email: \`teacher0@nursery.com\` | Mật khẩu: \`12345678\`
  * **Phụ huynh (Parent):** Email: \`parent0@gmail.com\` | Mật khẩu: \`12345678\``;
    }

    // Dự án 2: Mạng xã hội (Social Media)
    if (lower.includes('social') || lower.includes('socal') || lower.includes('mạng xã hội') || lower.includes('media')) {
      return `### Dự án: Social Network (Mạng xã hội) (05/2025 - 10/2025)
- **Vai trò:** Team Leader, thiết kế database, phát triển Backend NestJS và hỗ trợ xây dựng ứng dụng di động Mobile.
- **Giới thiệu:** Ứng dụng mạng xã hội cho phép chia sẻ các hoạt động thường ngày và tham gia vào các nhóm chung sở thích. Dự án là sự kết hợp các tính năng nổi bật của Facebook và Discord nhằm nâng cao khả năng giao tiếp, tương tác cộng đồng.
- **Công nghệ:** NestJS (Backend), React (Web), React Native (Mobile), MongoDB, Triển khai trên VPS riêng.
- **Liên kết thực tế:**
  * GitHub Backend: https://github.com/Hongtruongbvn/socal-media-backend
  * GitHub Frontend: https://github.com/Hongtruongbvn/socal-media-frontend
  * Link API (Deploy Backend - chạy trước): https://socal-media-backend-qh5r.onrender.com/api
  * Link Web App (Deploy Frontend - chạy sau): https://socal-media-frontend.vercel.app/`;
    }

    // Dự án 3: Bus Ticket (Vé xe)
    if (lower.includes('bus') || lower.includes('vé xe') || lower.includes('ve xe') || lower.includes('ticket')) {
      return `### Dự án: Bus Ticket Management (Quản lý bán vé xe khách) (12/2025 - 02/2026)
- **Vai trò:** Backend Developer. Phát triển toàn bộ Backend, tham gia hỗ trợ Frontend và tiến hành tái cấu trúc (refactoring) mã nguồn.
- **Giới thiệu:** Hệ thống quản lý và vận hành xe khách, đóng vai trò là nền tảng trung gian kết nối các nhà xe liên tỉnh để phân phối bán vé xe trực tuyến. Hệ thống hỗ trợ đắc lực trong việc quản lý phương tiện, tuyến đường chạy, bán vé, theo dõi doanh thu và phân chia hoa hồng tự động.
- **Công nghệ:** NestJS (Backend), React (Web), React Native (Mobile), MongoDB, cấu trúc dự án dạng Monorepo.
- **Liên kết thực tế:**
  * GitHub Repository (Monorepo): https://github.com/Hongtruongbvn/bus_ticket-.git`;
    }

    // Thông tin bản thân & học vấn
    if (lower.includes('bạn là ai') || lower.includes('giới thiệu') || lower.includes('thông tin') || lower.includes('học viện') || lower.includes('vtc')) {
      return `Chào bạn! Mình là **Phạm Hồng Trưởng**, là sinh viên chuyên ngành lập trình tại **Học viện Công nghệ VTC (VTC Academy)**, chuyên sâu về lập trình **Fullstack**. 
Mình có thế mạnh toàn diện về cả Backend (NestJS, Laravel) lẫn Frontend (React, React Native, Flutter). Rất vui được kết nối với bạn!`;
    }

    // Năng lực & Kỹ năng
    if (lower.includes('kỹ năng') || lower.includes('ky nang') || lower.includes('năng lực') || lower.includes('nang luc') || lower.includes('công nghệ')) {
      return `### Năng lực công nghệ của Phạm Hồng Trưởng:
- **Frameworks & Libraries:** NestJS, Laravel, React, React Native, Flutter.
- **Databases:** MySQL, MongoDB, SQL Server.
- **Tools & DevOps:** Docker, Git, Postman, Swagger, Jira, Trello.
- **Kỹ năng mềm:** Teamwork (Làm việc nhóm tốt ở vai trò Team Leader), Giải quyết vấn đề (Problem-solving), Tư duy logic sắc bén.`;
    }

    // Thông tin liên hệ
    if (lower.includes('liên hệ') || lower.includes('lien he') || lower.includes('email') || lower.includes('sđt') || lower.includes('địa chỉ') || lower.includes('điện thoại')) {
      return `Bạn có thể liên hệ trực tiếp với anh Phạm Hồng Trưởng qua các kênh sau:
- **Số điện thoại:** 0931266543
- **Email:** truongtruongbvn@gmail.com
- **Địa chỉ hiện tại:** Thành phố Hồ Chí Minh (Ho Chi Minh City)
- **GitHub:** https://github.com/Hongtruongbvn
- Bạn cũng có thể tải CV PDF chính thức của anh Trưởng tại đây để xem chi tiết thông tin: ${downloadUrl}`;
    }

    // Mặc định phản hồi kèm hướng dẫn tải CV
    return `Xin chào bạn, hiện hệ thống AI kết nối trực tuyến đang bận nhẹ. Tớ có thể cung cấp nhanh cho bạn các thông tin liên quan đến anh Phạm Hồng Trưởng:
1. Thông tin bản thân & Học tập (VTC Academy).
2. Chi tiết 3 dự án lớn: Quản lý Trường mầm non, Mạng xã hội (Social Media), Bán vé xe khách (Bus Ticket).
3. Thông tin liên hệ (SĐT: 0931266543 | Email: truongtruongbvn@gmail.com).

Hoặc bạn có thể tải bản CV PDF chính thức của anh Trưởng trực tiếp tại đây: ${downloadUrl}`;
  }

  async askGemini(userQuestion: string): Promise<string> {
    try {
      const qnaList = await this.qnaService.findAll();
      const qnaKnowledge = qnaList
        .map((item, index) => `${index + 1}. Hỏi: "${item.question}" -> Trả lời: "${item.answer}"`)
        .join('\n');

      const systemInstruction = `
Bạn là một trợ lý ảo thông minh đại diện phát ngôn cho Phạm Hồng Trưởng.
Nhiệm vụ của bạn là trả lời các câu hỏi một cách lịch sự, chuyên nghiệp và đầy tự hào dựa trên các thông tin chính thức dưới đây.

=== THÔNG TIN VỀ BẢN THÂN ===
- Họ và tên: Phạm Hồng Trưởng
- Học vấn: Sinh viên Học viện VTC (VTC Academy), được đào tạo bài bản và chuyên sâu về lập trình Fullstack (Fullstack Developer).
- Địa chỉ: Thành phố Hồ Chí Minh (Ho Chi Minh City).
- Số điện thoại liên hệ: 0931266543
- Email: truongtruongbvn@gmail.com
- GitHub cá nhân: https://github.com/Hongtruongbvn

=== NĂNG LỰC CÔNG NGHỆ ===
- Frameworks & Libraries: Laravel, NestJS, React, React Native, Flutter
- Databases: MongoDB, MySQL, SQL Server
- Tools & Quản lý: Docker, Git, Postman, Swagger, Jira, Trello
- Kỹ năng bổ trợ: Teamwork (đặc biệt có kinh nghiệm làm Team Leader), Giải quyết vấn đề (Problem-solving), Tư duy logic (Logical thinking).

=== DANH SÁCH DỰ ÁN CHI TIẾT ===

1. Bus Ticket Management (Quản lý bán vé xe khách) (Thời gian: 12/2025 - 02/2026)
   - Vai trò: Backend Developer.
   - Giới thiệu: Hệ thống quản lý và vận hành xe khách liên tỉnh, đóng vai trò là nền tảng trung gian kết nối các nhà xe để phân phối và bán vé trực tuyến.
   - Mục đích: Hỗ trợ bán vé, quản lý xe, quản lý lộ trình, vé và doanh thu; tối ưu hóa quy trình vận hành và tự động hóa chia hoa hồng.
   - Công nghệ: NestJS (Backend), React (Web), React Native (Mobile), MongoDB, kiến trúc Monorepo.
   - Source Code: https://github.com/Hongtruongbvn/bus_ticket-.git (mô hình Monorepo)

2. Social Network (Mạng xã hội đa nền tảng) (Thời gian: 05/2025 - 10/2025)
   - Vai trò: Team Leader.
   - Giới thiệu: Ứng dụng mạng xã hội cho phép người dùng chia sẻ hoạt động, hình ảnh và tham gia các nhóm chung sở thích. Sự kết hợp các tính năng nổi bật của Facebook và Discord.
   - Mục đích: Tối ưu hóa việc kết nối cộng đồng, trò chuyện nhóm và truyền tải thông tin mượt mà.
   - Công nghệ: NestJS (Backend), React (Web), React Native (Mobile), MongoDB, triển khai thực tế trên VPS.
   - Deploy thực tế (Hỏi chi tiết dự án hãy đưa link này):
     * Backend Deploy (phải chạy trước): https://socal-media-backend-qh5r.onrender.com/api
     * Frontend Deploy (chạy sau): https://socal-media-frontend.vercel.app/
     * Source Code Backend: https://github.com/Hongtruongbvn/socal-media-backend
     * Source Code Frontend: https://github.com/Hongtruongbvn/socal-media-frontend

3. Kindergarten Management (Hệ thống quản lý trường mầm non) (Thời gian: 11/2024 - 01/2025)
   - Vai trò: Team Leader.
   - Giới thiệu: Hệ thống quản lý trường mầm non toàn diện, quản lý thời khóa biểu, giáo viên, học sinh và cơ sở vật chất.
   - Mục đích: Giảm thiểu thủ tục giấy tờ, rút ngắn khoảng cách giữa nhà trường và phụ huynh qua hệ thống camera theo dõi trực tiếp và cổng thanh toán học phí online.
   - Công nghệ: Laravel, MySQL.
   - Deploy thực tế và thông tin tài khoản:
     * Link Demo (Deploy): https://quan-ly-truong-mam-non.onrender.com/
     * Source Code GitHub: https://github.com/Hongtruongbvn/quan_ly_truong_mam_non
     * Tài khoản Admin Demo: Số điện thoại: 0987654321 / Mật khẩu: 12345678
     * Tài khoản Giáo viên Demo: Email: teacher0@nursery.com / Mật khẩu: 12345678
     * Tài khoản Phụ huynh Demo: Email: parent0@gmail.com / Mật khẩu: 12345678

=== FILE CV PDF ===
Đường dẫn tải CV chính thức: http://localhost:3000/public/${this.cvFileName}

=== QUY TẮC PHẢN HỒI QUAN TRỌNG ===
1. Khi khách hỏi xin CV hoặc muốn tải hồ sơ, luôn gửi kèm link tải chính xác: http://localhost:3000/public/${this.cvFileName}.
2. Nếu hỏi về dự án, hãy đưa đầy đủ các thông tin: Giới thiệu, mục đích, công nghệ, vai trò của Trưởng, kèm link source code GitHub và các liên kết Deploy thực tế tương ứng.
3. Nếu người dùng hỏi các câu hỏi hoàn toàn ngoài luồng không liên quan đến Trưởng (giải toán, làm thơ, viết mã nguồn không liên quan), hãy lịch sự từ chối và hướng họ đặt câu hỏi về Trưởng.
4. Trả lời bằng tiếng Việt, giọng điệu chuyên nghiệp, tự tin và thân thiện.
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

      // Kích hoạt cứu hộ Local nếu lỗi API
      console.warn('[AI Local Fallback] Đang kích hoạt chế độ phản hồi cục bộ do Google sập hệ thống...');
      return this.handleLocalFallback(userQuestion);

    } catch (error) {
      console.error('[Chat Service Error]', error);
      return `Hiện tại tớ đang bảo trì nhẹ hệ thống. Bạn có thể tải file hồ sơ CV của anh Trưởng trực tiếp tại đây để tham khảo nhanh nhé: http://localhost:3000/public/${this.cvFileName}`;
    }
  }
}