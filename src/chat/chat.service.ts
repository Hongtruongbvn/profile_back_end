import { Injectable, OnModuleInit } from '@nestjs/common';
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
    await this.seedDefaultData();
  }

  // Lấy base URL động (chạy local hay production)
  private getBaseUrl(): string {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      return 'https://profile-back-end.onrender.com';
    }
    return `http://localhost:${this.configService.get<number>('PORT') || 3000}`;
  }

  private getPublicUrl(): string {
    return `${this.getBaseUrl()}/public`;
  }

  // Lấy danh sách ảnh từ thư mục public
  private getImageUrlsFromFolder(folderName: string): string[] {
    const publicPath = path.join(process.cwd(), 'public', folderName);
    const baseUrl = this.getPublicUrl();
    const imageUrls: string[] = [];
    
    try {
      if (fs.existsSync(publicPath)) {
        const files = fs.readdirSync(publicPath);
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'];
        
        files.forEach(file => {
          const ext = path.extname(file).toLowerCase();
          if (imageExtensions.includes(ext)) {
            imageUrls.push(`${baseUrl}/${folderName}/${file}`);
          }
        });
      }
    } catch (error) {
      console.error(`[Image Loader] Lỗi đọc thư mục ${folderName}:`, error);
    }
    
    return imageUrls;
  }

  // Tạo markdown cho ảnh
  private getImageMarkdown(folderName: string): string {
    const images = this.getImageUrlsFromFolder(folderName);
    if (images.length === 0) return '';
    return `\n\n### 🖼️ Hình ảnh giao diện dự án:\n${images.map(url => `![image](${url})`).join('\n')}`;
  }

  private async seedDefaultData() {
    try {
      const currentData = await this.qnaService.findAll();
      if (currentData.length > 0) {
        console.log('[Database Seeder] Dữ liệu Q&A đã tồn tại. Bỏ qua bước nạp mặc định.');
        return;
      }

      console.log('[Database Seeder] Phát hiện database trống. Đang nạp dữ liệu hồ sơ mặc định của Phạm Hồng Trưởng...');

      const cvDownloadUrl = `${this.getPublicUrl()}/${this.cvFileName}`;
      
      // Lấy ảnh từ các thư mục dự án
      const project1Images = this.getImageMarkdown('project1');
      const project2Images = this.getImageMarkdown('project2');
      const project3Images = this.getImageMarkdown('project3');

      const defaultQnas = [
        {
          question: "Bạn là ai? Giới thiệu bản thân",
          answer: "Mình là Phạm Hồng Trưởng (Pham Hong Truong), sinh viên Học viện Công nghệ VTC (VTC Academy) chuyên ngành lập trình Fullstack. Thế mạnh của mình là NestJS, Laravel, React và React Native."
        },
        {
          question: "Kỹ năng chuyên môn của bạn là gì?",
          answer: "**Frameworks:** Laravel, React, React Native, Flutter, NestJS\n**Databases:** MySQL, SQL Server, MongoDB\n**Tools:** Docker, Git, Postman, Swagger, Jira, Trello\n**Soft Skills:** Team Leader, Problem-solving, Logical thinking."
        },
        {
          question: "Xem chi tiết dự án Mầm non",
          answer: `### 🏫 Dự án: Quản lý trường Mầm non (11/2024 - 01/2025)\n\n**Vai trò:** Team Leader\n**Công nghệ:** Laravel, MySQL\n**Mô tả:** Hệ thống quản lý trường mầm non toàn diện, quản lý lịch học, giáo viên, học sinh, tích hợp camera giám sát và thanh toán online.\n\n**🔗 Link Demo:** https://quan-ly-truong-mam-non.onrender.com/\n**📁 Mã nguồn:** https://github.com/Hongtruongbvn/quan_ly_truong_mam_non\n\n**👥 Tài khoản dùng thử:**\n- Admin: SĐT 0987654321 / MK: 12345678\n- Giáo viên: teacher0@nursery.com / 12345678\n- Phụ huynh: parent0@gmail.com / 12345678${project1Images}`
        },
        {
          question: "Xem chi tiết dự án Social Network",
          answer: `### 🌐 Dự án: Social Network (05/2025 - 10/2025)\n\n**Vai trò:** Team Leader\n**Công nghệ:** NestJS, React, React Native, MongoDB\n**Mô tả:** Mạng xã hội kết hợp tính năng của Facebook và Discord, cho phép kết nối cộng đồng, nhắn tin, chia sẻ.\n\n**🔗 Link Demo Web:** https://socal-media-frontend.vercel.app/\n**🔗 Backend API:** https://socal-media-backend-qh5r.onrender.com/api\n**📁 Mã nguồn Backend:** https://github.com/Hongtruongbvn/socal-media-backend\n**📁 Mã nguồn Frontend:** https://github.com/Hongtruongbvn/socal-media-frontend${project2Images}`
        },
        {
          question: "Xem chi tiết dự án Bus Ticket",
          answer: `### 🚌 Dự án: Bus Ticket Management (12/2025 - 02/2026)\n\n**Vai trò:** Backend Developer\n**Công nghệ:** NestJS, React, React Native, MongoDB, Monorepo\n**Mô tả:** Nền tảng trung gian quản lý xe, lộ trình, bán vé và tự động chia hoa hồng.\n\n**📁 Mã nguồn:** https://github.com/Hongtruongbvn/bus_ticket-.git${project3Images}`
        },
        {
          question: "Xem dự án Golang và Winform",
          answer: `### ⚡ Các dự án phụ bằng Golang & C# WinForms\n\n**1. Golang Backend & DevOps:**\n- DevOps Go: https://github.com/Hongtruongbvn/back-devop\n- Go Base BE: https://github.com/Hongtruongbvn/goalnd_24-05_be\n- Go Final BE: https://github.com/Hongtruongbvn/goalnd_final_be\n\n**2. C# WinForms:**\n- Child Management: https://github.com/truongbvnedu/Child_MNG`
        },
        {
          question: "Thông tin liên hệ",
          answer: `📞 **SĐT:** 0931266543\n📧 **Email:** truongtruongbvn@gmail.com\n📍 **Địa chỉ:** TP. Hồ Chí Minh\n🐙 **GitHub:** https://github.com/Hongtruongbvn\n📄 **Tải CV:** ${cvDownloadUrl}`
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
      const cvPath = path.join(process.cwd(), 'public', this.cvFileName);
      if (fs.existsSync(cvPath)) {
        const dataBuffer = fs.readFileSync(cvPath);
        const parsedPdf = await pdf(dataBuffer);
        this.cvTextContent = parsedPdf.text;
        console.log(`[CV Loader] Đã tải thành công file: ${this.cvFileName}`);
      } else {
        console.warn(`[CV Loader] Không tìm thấy file CV tại: ${cvPath}`);
        this.cvTextContent = 'Chưa cập nhật file CV PDF.';
      }
    } catch (error) {
      console.error('[CV Loader] Lỗi:', error);
      this.cvTextContent = '';
    }
  }

  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private detectLanguage(text: string): 'en' | 'vi' {
    const englishPatterns = [
      'who are you', 'skills', 'project', 'kindergarten', 'social', 'bus',
      'download', 'cv', 'resume', 'contact', 'phone', 'mail', 'github'
    ];
    const lowerText = text.toLowerCase();
    const hasEnglish = englishPatterns.some(word => lowerText.includes(word));
    return hasEnglish ? 'en' : 'vi';
  }

  private getImageUrlsForQuestion(question: string): string {
    const lower = question.toLowerCase();
    if (lower.includes('mầm non') || lower.includes('kindergarten')) {
      return this.getImageMarkdown('project1');
    }
    if (lower.includes('social') || lower.includes('mạng xã hội')) {
      return this.getImageMarkdown('project2');
    }
    if (lower.includes('bus') || lower.includes('vé xe')) {
      return this.getImageMarkdown('project3');
    }
    return '';
  }

  private handleLocalFallback(userQuestion: string): string {
    const lower = userQuestion.toLowerCase().trim();
    const baseUrl = this.getPublicUrl();
    const downloadUrl = `${baseUrl}/${this.cvFileName}`;
    const lang = this.detectLanguage(userQuestion);
    const imageUrls = this.getImageUrlsForQuestion(userQuestion);

    const relatedKeywords = [
      'trưởng', 'truong', 'cv', 'dự án', 'project', 'kỹ năng', 'skills',
      'nestjs', 'react', 'liên hệ', 'mầm non', 'social', 'bus', 'golang', 'winform'
    ];

    const isRelated = relatedKeywords.some(keyword => lower.includes(keyword));

    if (!isRelated) {
      return lang === 'vi' 
        ? `Xin lỗi, câu hỏi này nằm ngoài phạm vi của tôi. Tôi chỉ hỗ trợ thông tin về Phạm Hồng Trưởng (kỹ năng, dự án, học vấn).`
        : `Sorry, this question is outside my scope. I only provide info about Pham Hong Truong.`;
    }

    if (lower.includes('mầm non') || lower.includes('kindergarten')) {
      return `### 🏫 Dự án Quản lý trường Mầm non\n\n**Vai trò:** Team Leader\n**Công nghệ:** Laravel, MySQL\n**Demo:** https://quan-ly-truong-mam-non.onrender.com/\n**GitHub:** https://github.com/Hongtruongbvn/quan_ly_truong_mam_non\n**Admin:** 0987654321 / 12345678${imageUrls}`;
    }

    if (lower.includes('social') || lower.includes('mạng xã hội')) {
      return `### 🌐 Dự án Social Network\n\n**Vai trò:** Team Leader\n**Công nghệ:** NestJS, React, MongoDB\n**Demo Web:** https://socal-media-frontend.vercel.app/\n**Backend API:** https://socal-media-backend-qh5r.onrender.com/api${imageUrls}`;
    }

    if (lower.includes('bus') || lower.includes('vé xe')) {
      return `### 🚌 Dự án Bus Ticket Management\n\n**Vai trò:** Backend Developer\n**Công nghệ:** NestJS, MongoDB\n**GitHub:** https://github.com/Hongtruongbvn/bus_ticket-.git${imageUrls}`;
    }

    if (lower.includes('golang') || lower.includes('winform')) {
      return `### ⚡ Dự án Golang & WinForm\n\n**Golang:**\n- DevOps: https://github.com/Hongtruongbvn/back-devop\n- Base BE: https://github.com/Hongtruongbvn/goalnd_24-05_be\n- Final BE: https://github.com/Hongtruongbvn/goalnd_final_be\n\n**C# WinForms:**\n- Child Management: https://github.com/truongbvnedu/Child_MNG`;
    }

    if (lower.includes('kỹ năng') || lower.includes('skills')) {
      return `### 🛠️ Kỹ năng của Phạm Hồng Trưởng\n\n**Frameworks:** NestJS, Laravel, React, React Native, Flutter\n**Databases:** MySQL, MongoDB, SQL Server\n**Tools:** Docker, Git, Postman, Swagger\n**Soft Skills:** Team Leader, Problem-solving`;
    }

    if (lower.includes('liên hệ') || lower.includes('contact')) {
      return `### 📞 Thông tin liên hệ\n\n📱 SĐT: 0931266543\n📧 Email: truongtruongbvn@gmail.com\n📍 Địa chỉ: TP. Hồ Chí Minh\n🐙 GitHub: https://github.com/Hongtruongbvn\n📄 Tải CV: ${downloadUrl}`;
    }

    return lang === 'vi'
      ? `Xin chào! Tôi là trợ lý của Phạm Hồng Trưởng. Bạn có thể hỏi về:\n- Kỹ năng công nghệ\n- Dự án Mầm non, Social Network, Bus Ticket\n- Dự án Golang, WinForm\n- Thông tin liên hệ\n- Tải CV: ${downloadUrl}`
      : `Hello! I am Pham Hong Truong's assistant. Ask me about his skills, projects, or download CV: ${downloadUrl}`;
  }

  async askGemini(userQuestion: string): Promise<string> {
    const isEnglish = this.detectLanguage(userQuestion) === 'en';
    const baseUrl = this.getPublicUrl();
    const cvDownloadUrl = `${baseUrl}/${this.cvFileName}`;
    const imageUrls = this.getImageUrlsForQuestion(userQuestion);
    
    try {
      const qnaList = await this.qnaService.findAll();
      const qnaKnowledge = qnaList
        .map((item, index) => `${index + 1}. Hỏi: "${item.question}" -> Trả lời: "${item.answer}"`)
        .join('\n');

      const systemInstruction = `
You are a bilingual AI Assistant representing Pham Hong Truong.

=== IMPORTANT RULES ===
1. When showing images, ALWAYS use markdown format: ![image](URL)
2. NEVER use local paths like C:\\ or ./public/
3. Use this base URL for all images: ${baseUrl}
4. Project images are in folders: /project1/, /project2/, /project3/
5. CV download URL: ${cvDownloadUrl}
6. Respond in the same language as the user.

=== PROFILE ===
- Name: Phạm Hồng Trưởng (Pham Hong Truong)
- Education: VTC Academy - Fullstack Development
- Phone: 0931266543 | Email: truongtruongbvn@gmail.com
- GitHub: https://github.com/Hongtruongbvn

=== TECH STACK ===
- Backend: NestJS, Laravel, Golang
- Frontend: React, React Native, Flutter
- Databases: MySQL, MongoDB, SQL Server
- Tools: Docker, Git, Postman, Swagger

=== PROJECTS ===

1. Kindergarten Management (Laravel, MySQL)
   - Demo: https://quan-ly-truong-mam-non.onrender.com/
   - GitHub: https://github.com/Hongtruongbvn/quan_ly_truong_mam_non
   - Images: ${baseUrl}/project1/
   - Credentials: Admin 0987654321/12345678

2. Social Network (NestJS, React, MongoDB)
   - Web Demo: https://socal-media-frontend.vercel.app/
   - Backend API: https://socal-media-backend-qh5r.onrender.com/api
   - GitHub Backend: https://github.com/Hongtruongbvn/socal-media-backend
   - Images: ${baseUrl}/project2/

3. Bus Ticket (NestJS, MongoDB)
   - GitHub: https://github.com/Hongtruongbvn/bus_ticket-.git
   - Images: ${baseUrl}/project3/

4. Side Projects:
   - Golang: https://github.com/Hongtruongbvn/back-devop
   - C# WinForms: https://github.com/truongbvnedu/Child_MNG

=== STRICT RULES ===
1. If user asks "Xem ảnh" or "Show images", respond with ALL image URLs from that project using markdown.
2. CV download link must be: ${cvDownloadUrl}
3. Stay focused on Truong's profile only.
4. Be polite and professional.
`;

      for (const modelName of this.MODEL_PREFERENCE) {
        let delay = 1000;
        const maxRetries = 2;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            console.log(`[AI Request] Model: ${modelName} | Attempt: ${attempt}/${maxRetries}`);
            
            // Thêm câu hỏi về ảnh nếu cần
            let finalQuestion = userQuestion;
            if ((userQuestion.includes('ảnh') || userQuestion.includes('image') || userQuestion.includes('hình')) && imageUrls) {
              finalQuestion = userQuestion + imageUrls;
            }
            
            const response = await this.ai.models.generateContent({
              model: modelName,
              contents: finalQuestion,
              config: { systemInstruction, temperature: 0.3 },
            });

            if (response && response.text) {
              // Đảm bảo response có ảnh nếu cần
              let result = response.text;
              if ((userQuestion.includes('ảnh') || userQuestion.includes('image')) && imageUrls && !result.includes('![]')) {
                result += imageUrls;
              }
              return result;
            }
          } catch (error: any) {
            if ((error?.status === 503 || error?.status === 429) && attempt < maxRetries) {
              console.warn(`[AI Warning] ${modelName} bận. Retry sau ${delay}ms...`);
              await this.sleep(delay);
              delay *= 1.5;
              continue;
            }
            break;
          }
        }
      }

      console.warn('[AI Local Fallback] Kích hoạt chế độ phản hồi cục bộ...');
      return this.handleLocalFallback(userQuestion);

    } catch (error) {
      console.error('[Chat Service Error]', error);
      return isEnglish 
        ? `The AI service is busy. Download Truong's CV: ${cvDownloadUrl}`
        : `Hệ thống đang bận. Tải CV của Trưởng tại: ${cvDownloadUrl}`;
    }
  }
}