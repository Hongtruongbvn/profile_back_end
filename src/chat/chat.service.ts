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
    await this.seedDefaultData(); // Tự động nạp dữ liệu mặc định vào MongoDB
  }

  // Hàm tự động nạp dữ liệu tri thức của Trưởng vào MongoDB nếu Database trống
  private async seedDefaultData() {
    try {
      const currentData = await this.qnaService.findAll();
      if (currentData.length > 0) {
        console.log('[Database Seeder] Dữ liệu Q&A đã tồn tại. Bỏ qua bước nạp mặc định.');
        return;
      }

      console.log('[Database Seeder] Phát hiện database trống. Đang nạp dữ liệu hồ sơ mặc định của Phạm Hồng Trưởng...');

      const defaultQnas = [
        {
          question: "Bạn là ai? Giới thiệu bản thân / Who are you? Introduce yourself",
          answer: "Mình là Phạm Hồng Trưởng (Pham Hong Truong), sinh viên Học viện Công nghệ VTC (VTC Academy) chuyên ngành lập trình Fullstack (Fullstack Developer). Thế mạnh của mình là NestJS, Laravel, React và React Native."
        },
        {
          question: "Kỹ năng chuyên môn của bạn là gì? / What are your technical skills?",
          answer: "Frameworks/Libraries: Laravel, React, React Native, Flutter, NestJS. Databases: MySQL, SQL Server, MongoDB. Tools: Trello, Jira, Git, Docker, Postman, Swagger. Kỹ năng mềm: Teamwork (Team Leader), Giải quyết vấn đề, Tư duy logic."
        },
        {
          question: "Dự án Kindergarten Management (Quản lý trường mầm non)",
          answer: "Dự án 1 (11/2024 - 01/2025) do mình làm Team Leader sử dụng Laravel & MySQL. Giúp tối ưu hóa vận hành, quản lý lịch học, giáo viên, học sinh, tích hợp camera giám sát và thanh toán học phí online. Mã nguồn: https://github.com/Hongtruongbvn/quan_ly_truong_mam_non | Link Deploy: https://quan-ly-truong-mam-non.onrender.com/ | Tài khoản Admin: SĐT: 0987654321 / MK: 12345678"
        },
        {
          question: "Dự án Social Network (Mạng xã hội đa nền tảng)",
          answer: "Dự án 2 (05/2025 - 10/2025) do mình làm Team Leader sử dụng NestJS, React, React Native, MongoDB. Tích hợp tính năng của Facebook và Discord để kết nối cộng đồng mượt mà. Link Frontend: https://socal-media-frontend.vercel.app/ | Link Backend: https://socal-media-backend-qh5r.onrender.com/api"
        },
        {
          question: "Dự án Bus Ticket Management (Quản lý bán vé xe khách)",
          answer: "Dự án 3 (12/2025 - 02/2026) mình làm Backend Developer sử dụng NestJS, React, React Native, MongoDB với kiến trúc Monorepo. Là nền tảng trung gian quản lý xe, lộ trình, bán vé và tự động hóa chia hoa hồng. Mã nguồn: https://github.com/Hongtruongbvn/bus_ticket-.git"
        },
        {
          question: "Thông tin liên hệ của Phạm Hồng Trưởng / Contact information",
          answer: "SĐT: 0931266543 | Email: truongtruongbvn@gmail.com | Địa chỉ: Ho Chi Minh City, Vietnam | GitHub: https://github.com/Hongtruongbvn"
        }
      ];

      for (const qna of defaultQnas) {
        await this.qnaService.create(qna);
      }
      console.log('[Database Seeder] Đã nạp thành công dữ liệu mặc định vào MongoDB!');
    } catch (error) {
      console.error('[Database Seeder] Lỗi khi nạp dữ liệu mặc định:', error);
    }
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

  // Phát hiện ngôn ngữ câu hỏi (Việt hay Anh) để cứu hộ đa ngôn ngữ chuẩn xác
  private detectLanguage(text: string): 'en' | 'vi' {
    const englishPatterns = [
      'who are you', 'skills', 'experience', 'project', 'kindergarten', 'social', 'bus ticket', 
      'download', 'cv', 'resume', 'contact', 'phone', 'mail', 'github', 'deploy', 'credentials'
    ];
    const lowerText = text.toLowerCase();
    const hasEnglish = englishPatterns.some(word => lowerText.includes(word));
    return hasEnglish ? 'en' : 'vi';
  }

  // HÀM TỰ CỨU HỘ ĐA NGÔN NGỮ: Phản hồi nhanh khi Google API gặp sự cố quá tải
  private handleLocalFallback(userQuestion: string): string {
    const lower = userQuestion.toLowerCase().trim();
    const downloadUrl = `http://localhost:3000/public/${this.cvFileName}`;
    const lang = this.detectLanguage(userQuestion);

    // 1. KIỂM TRA TÍNH LIÊN QUAN
    const relatedKeywords = [
      'trưởng', 'truong', 'cv', 'hồ sơ', 'ho so', 'kinh nghiệm', 'kinh nghiem', 'experience',
      'làm việc', 'lam viec', 'dự án', 'du an', 'project', 'kỹ năng', 'ky nang', 'skills',
      'nestjs', 'react', 'fullstack', 'liên hệ', 'lien he', 'bạn', 'cậu', 'ai', 'who',
      'tải', 'download', 'email', 'sđt', 'phone', 'portfolio', 'học vấn', 'hoc van', 'education',
      'mầm non', 'mam non', 'social', 'mạng xã hội', 'bus', 'ticket', 'vé xe', 'vtc', 'laravel'
    ];

    const isRelated = relatedKeywords.some(keyword => lower.includes(keyword));

    if (!isRelated) {
      return lang === 'vi' 
        ? `Xin lỗi bạn, câu hỏi này nằm ngoài phạm vi giải đáp của trợ lý ảo Phạm Hồng Trưởng. Tớ chỉ hỗ trợ cung cấp thông tin liên quan đến kỹ năng, kinh nghiệm, học vấn (VTC Academy) và các dự án của anh Trưởng!`
        : `Sorry, this question is outside the scope of Pham Hong Truong's AI Assistant. I can only assist with information related to Truong's skills, experience, education (VTC Academy), and projects!`;
    }

    // 2. PHÂN TÍCH TRẢ LỜI CỤ THỂ KHI OFFLINE
    
    // Dự án 1: Trường mầm non (Kindergarten)
    if (lower.includes('mầm non') || lower.includes('mam non') || lower.includes('kindergarten')) {
      return lang === 'vi' ? `### Dự án: Kindergarten Management (Quản lý trường mầm non) (11/2024 - 01/2025)
- **Vai trò:** Team Leader, thiết kế cơ sở dữ liệu, phát triển logic Backend và hỗ trợ Frontend.
- **Giới thiệu:** Hệ thống quản lý trường mầm non giúp tối ưu hóa lịch học, cơ sở vật chất, giáo viên và học sinh; tích hợp camera giám sát và cổng thanh toán học phí trực tuyến.
- **Công nghệ:** Laravel, MySQL.
- **Liên kết thực tế:**
  * GitHub Repository: https://github.com/Hongtruongbvn/quan_ly_truong_mam_non
  * Link Demo: https://quan-ly-truong-mam-non.onrender.com/
- **Tài khoản dùng thử (Demo Accounts):**
  * **Admin:** SĐT: \`0987654321\` | Mật khẩu: \`12345678\`
  * **Giáo viên:** Email: \`teacher0@nursery.com\` | Mật khẩu: \`12345678\`
  * **Phụ huynh:** Email: \`parent0@gmail.com\` | Mật khẩu: \`12345678\`` 
      : `### Project: Kindergarten Management (11/2024 - 01/2025)
- **Role:** Team Leader, designed database schema, implemented controllers & business logic, supported frontend.
- **Introduction:** A comprehensive management system streamlining schedules, facilities, teachers, and student records; integrated with live cameras and online payments.
- **Tech Stack:** Laravel, MySQL.
- **Links:**
  * GitHub Repository: https://github.com/Hongtruongbvn/quan_ly_truong_mam_non
  * Live Demo: https://quan-ly-truong-mam-non.onrender.com/
- **Demo Credentials:**
  * **Admin:** Phone: \`0987654321\` | Password: \`12345678\`
  * **Teacher:** Email: \`teacher0@nursery.com\` | Password: \`12345678\`
  * **Parent:** Email: \`parent0@gmail.com\` | Password: \`12345678\``;
    }

    // Dự án 2: Mạng xã hội (Social Media)
    if (lower.includes('social') || lower.includes('socal') || lower.includes('mạng xã hội') || lower.includes('media')) {
      return lang === 'vi' ? `### Dự án: Social Network (Mạng xã hội đa nền tảng) (05/2025 - 10/2025)
- **Vai trò:** Team Leader, thiết kế database, phát triển Backend NestJS và hỗ trợ xây dựng ứng dụng di động.
- **Giới thiệu:** Ứng dụng kết hợp tính năng nổi bật của Facebook và Discord nhằm tối ưu hóa liên lạc, tạo lập nhóm chung sở thích và chia sẻ khoảnh khắc.
- **Công nghệ:** NestJS (Backend), React (Web), React Native (Mobile), MongoDB, Triển khai VPS.
- **Liên kết thực tế:**
  * GitHub Backend: https://github.com/Hongtruongbvn/socal-media-backend
  * GitHub Frontend: https://github.com/Hongtruongbvn/socal-media-frontend
  * Deploy Backend (Phải chạy trước): https://socal-media-backend-qh5r.onrender.com/api
  * Deploy Frontend: https://socal-media-frontend.vercel.app/`
      : `### Project: Social Network (05/2025 - 10/2025)
- **Role:** Team Leader, database designer, developed NestJS Backend, supported mobile app.
- **Introduction:** Social network combining core features of Facebook and Discord for community chat, activity sharing, and interest groups.
- **Tech Stack:** NestJS (Backend), React (Web), React Native (Mobile), MongoDB, VPS Deployment.
- **Links:**
  * Backend Source: https://github.com/Hongtruongbvn/socal-media-backend
  * Frontend Source: https://github.com/Hongtruongbvn/socal-media-frontend
  * Live Backend API: https://socal-media-backend-qh5r.onrender.com/api
  * Live Frontend: https://socal-media-frontend.vercel.app/`;
    }

    // Dự án 3: Bus Ticket (Vé xe)
    if (lower.includes('bus') || lower.includes('vé xe') || lower.includes('ve xe') || lower.includes('ticket')) {
      return lang === 'vi' ? `### Dự án: Bus Ticket Management (Quản lý bán vé xe khách) (12/2025 - 02/2026)
- **Vai trò:** Backend Developer. Phát triển Backend, hỗ trợ phát triển Frontend và tái cấu trúc (refactoring) mã nguồn.
- **Giới thiệu:** Nền tảng trung gian kết nối các nhà xe liên tỉnh bán vé trực tuyến. Quản lý phương tiện, tuyến đường, theo dõi doanh thu và chia hoa hồng tự động.
- **Công nghệ:** NestJS (Backend), React (Web), React Native (Mobile), MongoDB, Monorepo Architecture.
- **Liên kết thực tế:**
  * GitHub Repository: https://github.com/Hongtruongbvn/bus_ticket-.git`
      : `### Project: Bus Ticket Management (12/2025 - 02/2026)
- **Role:** Backend Developer. Implemented backend, refactored codebase, and supported frontend development.
- **Introduction:** An intermediary ticket booking platform connecting provincial bus operators. Handles vehicle tracking, route routing, revenue metrics, and automated commission payouts.
- **Tech Stack:** NestJS (Backend), React (Web), React Native (Mobile), MongoDB, Monorepo Architecture.
- **Links:**
  * GitHub Monorepo: https://github.com/Hongtruongbvn/bus_ticket-.git`;
    }

    // Học vấn & Bản thân
    if (lower.includes('bạn là ai') || lower.includes('giới thiệu') || lower.includes('thông tin') || lower.includes('vtc') || lower.includes('who are you') || lower.includes('introduce')) {
      return lang === 'vi' 
        ? `Chào bạn! Mình là **Phạm Hồng Trưởng**, sinh viên chuyên ngành lập trình tại **Học viện Công nghệ VTC (VTC Academy)**, chuyên sâu về lập trình **Fullstack**. Mình làm chủ tốt cả Backend (NestJS, Laravel) lẫn Frontend (React, React Native, Flutter).`
        : `Hello! I'm **Pham Hong Truong**, a student at **VTC Academy** majoring in **Fullstack Web/Mobile Development**. I am highly proficient in NestJS, Laravel, React, and React Native.`;
    }

    // Năng lực & Kỹ năng
    if (lower.includes('kỹ năng') || lower.includes('ky nang') || lower.includes('skills') || lower.includes('năng lực')) {
      return lang === 'vi' ? `### Năng lực công nghệ của Phạm Hồng Trưởng:
- **Frameworks & Libraries:** NestJS, Laravel, React, React Native, Flutter.
- **Databases:** MySQL, MongoDB, SQL Server.
- **Tools & DevOps:** Docker, Git, Postman, Swagger, Jira, Trello.
- **Kỹ năng mềm:** Teamwork (Kinh nghiệm Team Leader tốt), Giải quyết vấn đề, Tư duy logic.`
      : `### Pham Hong Truong's Technical Skills:
- **Frameworks & Libraries:** NestJS, Laravel, React, React Native, Flutter.
- **Databases:** MySQL, MongoDB, SQL Server.
- **Tools & DevOps:** Docker, Git, Postman, Swagger, Jira, Trello.
- **Soft Skills:** Teamwork (Team Leader experience), Problem-solving, Logical thinking.`;
    }

    // Thông tin liên hệ
    if (lower.includes('liên hệ') || lower.includes('lien he') || lower.includes('contact') || lower.includes('email') || lower.includes('phone') || lower.includes('sđt')) {
      return lang === 'vi' ? `Bạn có thể liên hệ trực tiếp với anh Phạm Hồng Trưởng qua:
- **Số điện thoại:** 0931266543
- **Email:** truongtruongbvn@gmail.com
- **Địa chỉ:** Thành phố Hồ Chí Minh, Việt Nam
- **GitHub:** https://github.com/Hongtruongbvn
- Tải CV trực tiếp: ${downloadUrl}`
      : `You can reach Pham Hong Truong directly via:
- **Phone Number:** 0931266543
- **Email:** truongtruongbvn@gmail.com
- **Location:** Ho Chi Minh City, Vietnam
- **GitHub:** https://github.com/Hongtruongbvn
- Download Resume: ${downloadUrl}`;
    }

    return lang === 'vi' 
      ? `Xin chào! Máy chủ Google AI trực tuyến đang bận một chút, nhưng tớ đã kích hoạt chế độ phục vụ tự động cục bộ. Bạn có thể hỏi tớ về các kỹ năng, học tập tại VTC Academy, 3 dự án lớn (Mầm non, Social Network, Bus Ticket) hoặc tải CV trực tiếp tại đây: ${downloadUrl}`
      : `Hello! The Google AI service is temporarily experiencing high demand, but I've triggered my offline fallback mode. You can ask me about Truong's VTC Academy education, technical skills, 3 major projects (Kindergarten, Social, Bus Ticket), or download his Resume here: ${downloadUrl}`;
  }

  async askGemini(userQuestion: string): Promise<string> {
     const isEnglish = this.detectLanguage(userQuestion) === 'en';
    try {
      const qnaList = await this.qnaService.findAll();
      const qnaKnowledge = qnaList
        .map((item, index) => `${index + 1}. Hỏi: "${item.question}" -> Trả lời: "${item.answer}"`)
        .join('\n');

     

      const systemInstruction = `
You are a bilingual (English and Vietnamese) intelligent AI Assistant representing Pham Hong Truong.
Your goal is to answer queries politely, professionally, and proudly.

=== PHAM HONG TRUONG'S PROFILE ===
- Full Name: Phạm Hồng Trưởng (Pham Hong Truong)
- Education: Fullstack Student at VTC Academy (Học viện Công nghệ VTC).
- Location: Ho Chi Minh City, Vietnam.
- Phone: 0931266543
- Email: truongtruongbvn@gmail.com
- GitHub: https://github.com/Hongtruongbvn

=== TECH STACK ===
- Frameworks & Libraries: Laravel, NestJS, React, React Native, Flutter
- Databases: MongoDB, MySQL, SQL Server
- Tools: Docker, Git, Postman, Swagger, Jira, Trello
- Strengths: Teamwork (Team Leader experience), Problem-solving, Logical thinking.

=== THREE COMPREHENSIVE PROJECTS ===

1. Bus Ticket Management (12/2025 - 02/2026)
   - Role: Backend Developer (NestJS). Developed backend APIs, refactored codebase, supported React frontend.
   - Purpose: An intermediary platform connecting interprovincial bus operators to book and sell tickets online, manage routes, vehicles, tracking revenue, and auto-calculating commission payouts.
   - Architecture: Monorepo
   - Repository: https://github.com/Hongtruongbvn/bus_ticket-.git

2. Social Network (05/2025 - 10/2025)
   - Role: Team Leader (NestJS, React, React Native, MongoDB). Designed database schema, implemented core backend, supported mobile application.
   - Purpose: Social networking application combining best features of Facebook and Discord. Offers sharing activities, private messaging, and interest-centric groups.
   - Deployment: Hosted on VPS
   - Deployment Links:
     * Backend API Link (Ensure backend is awake first): https://socal-media-backend-qh5r.onrender.com/api
     * Frontend Client Link: https://socal-media-frontend.vercel.app/
     * Backend Source: https://github.com/Hongtruongbvn/socal-media-backend
     * Frontend Source: https://github.com/Hongtruongbvn/socal-media-frontend

3. Kindergarten Management (11/2024 - 01/2025)
   - Role: Team Leader (Laravel, MySQL). Built relational databases, optimized server controllers/business logic, supported frontend templates.
   - Purpose: School operational suite handling schedules, administrative facilities, teacher rosters, and student tracking. Decreased school-parent boundaries via CCTV integration and online payment portals.
   - Deployment: https://quan-ly-truong-mam-non.onrender.com/
   - GitHub Repository: https://github.com/Hongtruongbvn/quan_ly_truong_mam_non
   - Demo Credentials:
     * Admin: Phone 0987654321 | Password 12345678
     * Teacher: Email teacher0@nursery.com | Password 12345678
     * Parent: Email parent0@gmail.com | Password 12345678

=== CV DOWNLOAD ===
Direct download URL: http://localhost:3000/public/${this.cvFileName}

=== STRICT CHAT RULES ===
1. Respond to the user in the language they used to query. If they ask in English, answer in English. If they ask in Vietnamese, answer in Vietnamese.
2. If the user asks for Truong's CV/Resume, you MUST provide the direct download link: http://localhost:3000/public/${this.cvFileName}.
3. If the user asks about Truong's projects, always detail: Title, role, technology, purpose, and provide the relevant code repositories and deployment URLs.
4. If they ask unrelated off-topic questions (like solving math, writing random HTML codes not belonging to his profile, storytelling), politely decline and redirect them to ask about Pham Hong Truong.
5. Be polite, confident, professional, and friendly.
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
      return isEnglish 
        ? `The AI service is currently busy. You can download Pham Hong Truong's official Resume directly here: http://localhost:3000/public/${this.cvFileName}`
        : `Hiện tại tớ đang bảo trì nhẹ hệ thống. Bạn có thể tải file hồ sơ CV của anh Trưởng trực tiếp tại đây để tham khảo nhanh nhé: http://localhost:3000/public/${this.cvFileName}`;
    }
  }
}