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

  private getBaseUrl(): string {
    return 'https://profile-back-end.onrender.com';
  }

  private getPublicUrl(): string {
    return `${this.getBaseUrl()}/public`;
  }

  private getMediaUrlsFromFolder(folderName: string): { images: string[], videos: string[] } {
    const publicPath = path.join(process.cwd(), 'public', folderName);
    const baseUrl = this.getPublicUrl();
    const images: string[] = [];
    const videos: string[] = [];
    
    try {
      if (fs.existsSync(publicPath)) {
        const files = fs.readdirSync(publicPath);
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'];
        const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.m4v', '.avi', '.mkv'];
        
        files.forEach(file => {
          const ext = path.extname(file).toLowerCase();
          const fileUrl = `${baseUrl}/${folderName}/${file}`;
          if (imageExtensions.includes(ext)) {
            images.push(fileUrl);
          } else if (videoExtensions.includes(ext)) {
            videos.push(fileUrl);
          }
        });
        console.log(`[Media Loader] ${folderName}: ${images.length} ảnh, ${videos.length} video`);
      }
    } catch (error) {
      console.error(`[Media Loader] Lỗi:`, error);
    }
    
    return { images, videos };
  }

  private getMediaMarkdown(folderName: string): string {
    const { images, videos } = this.getMediaUrlsFromFolder(folderName);
    let result = '';
    
    if (images.length > 0) {
      result += `\n\n### 🖼️ Hình ảnh giao diện dự án:\n${images.map(url => `![image](${url})`).join('\n')}`;
    }
    
    if (videos.length > 0) {
      result += `\n\n### 🎥 Video demo dự án:\n${videos.map(url => `![video](${url})`).join('\n')}`;
    }
    
    return result;
  }

  private getMediaForQuestion(question: string): string {
    const lower = question.toLowerCase();
    if (lower.includes('mầm non') || lower.includes('kindergarten') || lower.includes('mam non')) {
      return this.getMediaMarkdown('project1');
    }
    if (lower.includes('social') || lower.includes('mạng xã hội')) {
      return this.getMediaMarkdown('project2');
    }
    if (lower.includes('bus') || lower.includes('vé xe') || lower.includes('bus ticket')) {
      return this.getMediaMarkdown('project3');
    }
    return '';
  }

  private getSystemInstruction(lang: 'vi' | 'en'): string {
    const baseUrl = this.getPublicUrl();
    const cvDownloadUrl = `${baseUrl}/${this.cvFileName}`;
    
    if (lang === 'en') {
      return `
You are Pham Hong Truong's bilingual AI Assistant.

=== CRITICAL RULES ===
1. ALWAYS respond in the SAME LANGUAGE as the user's question
2. When showing images, use markdown: ![image](URL)
3. When showing videos, use markdown: ![video](URL)
4. Use this base URL for all media: ${baseUrl}
5. CV download: ${cvDownloadUrl}
6. Stay focused on Truong's profile only

=== PROFILE ===
- Name: Phạm Hồng Trưởng (Pham Hong Truong)
- Education: VTC Academy - Fullstack Development
- Phone: 0931266543 | Email: truongtruongbvn@gmail.com
- GitHub: https://github.com/Hongtruongbvn
- Avatar: ${baseUrl}/user/avatar.png

=== TECH STACK ===
- Backend: NestJS, Laravel, Golang
- Frontend: React, React Native, Flutter
- Databases: MySQL, MongoDB, SQL Server
- Tools: Docker, Git, Postman, Swagger

=== PROJECTS ===

1. Kindergarten Management (Laravel, MySQL)
   - Demo: https://quan-ly-truong-mam-non.onrender.com/
   - GitHub: https://github.com/Hongtruongbvn/quan_ly_truong_mam_non
   - Media folder: /project1/ (images + videos)
   - Credentials: Admin 0987654321/12345678

2. Social Network (NestJS, React, MongoDB)
   - Web Demo: https://socal-media-frontend.vercel.app/
   - Backend API: https://socal-media-backend-qh5r.onrender.com/api
   - GitHub Backend: https://github.com/Hongtruongbvn/socal-media-backend
   - Media folder: /project2/ (images + videos)

3. Bus Ticket (NestJS, MongoDB)
   - GitHub: https://github.com/Hongtruongbvn/bus_ticket-.git
   - Media folder: /project3/ (images + videos)

4. Side Projects:
   - Golang: https://github.com/Hongtruongbvn/back-devop
   - C# WinForms: https://github.com/truongbvnedu/Child_MNG

=== STRICT RULES ===
1. If user asks for "images", "videos", "show", "xem ảnh", "xem video" - respond with ALL media from that project
2. CV download link must be: ${cvDownloadUrl}
3. Be polite, professional, and helpful
4. When asked "Who are you?" or "Bạn là ai?", respond with your profile information including avatar link
`;
    }
    
    return `
Bạn là trợ lý AI song ngữ của Phạm Hồng Trưởng.

=== QUY TẮC QUAN TRỌNG ===
1. LUÔN trả lời bằng NGÔN NGỮ giống câu hỏi của người dùng
2. Khi hiển thị ảnh, dùng markdown: ![image](URL)
3. Khi hiển thị video, dùng markdown: ![video](URL)
4. Dùng base URL này cho media: ${baseUrl}
5. Tải CV tại: ${cvDownloadUrl}
6. Chỉ trả lời về hồ sơ của Trưởng

=== HỒ SƠ ===
- Tên: Phạm Hồng Trưởng (Pham Hong Truong)
- Học vấn: VTC Academy - Fullstack Development
- Điện thoại: 0931266543 | Email: truongtruongbvn@gmail.com
- GitHub: https://github.com/Hongtruongbvn
- Avatar: ${baseUrl}/user/avatar.png

=== CÔNG NGHỆ ===
- Backend: NestJS, Laravel, Golang
- Frontend: React, React Native, Flutter
- Databases: MySQL, MongoDB, SQL Server
- Tools: Docker, Git, Postman, Swagger

=== DỰ ÁN ===

1. Quản lý trường Mầm non (Laravel, MySQL)
   - Demo: https://quan-ly-truong-mam-non.onrender.com/
   - GitHub: https://github.com/Hongtruongbvn/quan_ly_truong_mam_non
   - Thư mục media: /project1/ (ảnh + video)
   - Tài khoản: Admin 0987654321/12345678

2. Social Network (NestJS, React, MongoDB)
   - Demo Web: https://socal-media-frontend.vercel.app/
   - Backend API: https://socal-media-backend-qh5r.onrender.com/api
   - GitHub Backend: https://github.com/Hongtruongbvn/socal-media-backend
   - Thư mục media: /project2/ (ảnh + video)

3. Bus Ticket (NestJS, MongoDB)
   - GitHub: https://github.com/Hongtruongbvn/bus_ticket-.git
   - Thư mục media: /project3/ (ảnh + video)

4. Dự án phụ:
   - Golang: https://github.com/Hongtruongbvn/back-devop
   - C# WinForms: https://github.com/truongbvnedu/Child_MNG

=== QUY TẮC NGHIÊM NGẶT ===
1. Nếu user hỏi "xem ảnh", "xem video", "show images" - trả về TẤT CẢ media từ dự án đó
2. Link tải CV phải là: ${cvDownloadUrl}
3. Lịch sự, chuyên nghiệp và hữu ích
4. Khi được hỏi "Bạn là ai?" hoặc "Who are you?", hãy trả lời đầy đủ thông tin hồ sơ kèm link avatar
`;
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
      const avatarUrl = `${this.getPublicUrl()}/user/avatar.png`;
      
      const project1Media = this.getMediaMarkdown('project1');
      const project2Media = this.getMediaMarkdown('project2');
      const project3Media = this.getMediaMarkdown('project3');

      const defaultQnas = [
        {
          question: "Bạn là ai? Giới thiệu bản thân",
          answer: `### 👨‍💻 Giới thiệu về Phạm Hồng Trưởng\n\n![Avatar](${avatarUrl})\n\n**Tên:** Phạm Hồng Trưởng (Pham Hong Truong)\n**Học vấn:** Sinh viên Học viện Công nghệ VTC (VTC Academy) chuyên ngành Fullstack Development\n**Điện thoại:** 0931266543\n**Email:** truongtruongbvn@gmail.com\n**GitHub:** https://github.com/Hongtruongbvn\n\n**Thế mạnh:** NestJS, Laravel, React, React Native, Flutter\n\n**Mục tiêu:** Xây dựng các sản phẩm Web/Mobile tối ưu, hiện đại và mang lại giá trị thực cho người dùng.`
        },
        {
          question: "Who are you? Introduce yourself",
          answer: `### 👨‍💻 About Pham Hong Truong\n\n![Avatar](${avatarUrl})\n\n**Name:** Pham Hong Truong\n**Education:** VTC Academy - Fullstack Development\n**Phone:** 0931266543\n**Email:** truongtruongbvn@gmail.com\n**GitHub:** https://github.com/Hongtruongbvn\n\n**Strengths:** NestJS, Laravel, React, React Native, Flutter\n\n**Goal:** Build optimized, modern Web/Mobile products that bring real value to users.`
        },
        {
          question: "Kỹ năng chuyên môn của bạn là gì?",
          answer: "**Frameworks:** Laravel, React, React Native, Flutter, NestJS\n**Databases:** MySQL, SQL Server, MongoDB\n**Tools:** Docker, Git, Postman, Swagger, Jira, Trello\n**Soft Skills:** Team Leader, Problem-solving, Logical thinking."
        },
        {
          question: "What are your professional skills?",
          answer: "**Frameworks:** Laravel, React, React Native, Flutter, NestJS\n**Databases:** MySQL, SQL Server, MongoDB\n**Tools:** Docker, Git, Postman, Swagger, Jira, Trello\n**Soft Skills:** Team Leader, Problem-solving, Logical thinking."
        },
        {
          question: "Xem chi tiết dự án Mầm non",
          answer: `### 🏫 Dự án: Quản lý trường Mầm non (11/2024 - 01/2025)\n\n**Vai trò:** Team Leader\n**Công nghệ:** Laravel, MySQL\n**Mô tả:** Hệ thống quản lý trường mầm non toàn diện, quản lý lịch học, giáo viên, học sinh, tích hợp camera giám sát và thanh toán online.\n\n**🔗 Link Demo:** https://quan-ly-truong-mam-non.onrender.com/\n**📁 Mã nguồn:** https://github.com/Hongtruongbvn/quan_ly_truong_mam_non\n\n**👥 Tài khoản dùng thử:**\n- Admin: SĐT 0987654321 / MK: 12345678\n- Giáo viên: teacher0@nursery.com / 12345678\n- Phụ huynh: parent0@gmail.com / 12345678${project1Media}`
        },
        {
          question: "Show Kindergarten project details",
          answer: `### 🏫 Project: Kindergarten Management (11/2024 - 01/2025)\n\n**Role:** Team Leader\n**Tech:** Laravel, MySQL\n**Description:** Comprehensive kindergarten management system for schedules, teachers, students, with camera integration and online payment.\n\n**🔗 Demo Link:** https://quan-ly-truong-mam-non.onrender.com/\n**📁 Source Code:** https://github.com/Hongtruongbvn/quan_ly_truong_mam_non\n\n**👥 Test Credentials:**\n- Admin: Phone 0987654321 / PW: 12345678\n- Teacher: teacher0@nursery.com / 12345678\n- Parent: parent0@gmail.com / 12345678${project1Media}`
        },
        {
          question: "Xem chi tiết dự án Social Network",
          answer: `### 🌐 Dự án: Social Network (05/2025 - 10/2025)\n\n**Vai trò:** Team Leader\n**Công nghệ:** NestJS, React, React Native, MongoDB\n**Mô tả:** Mạng xã hội kết hợp tính năng của Facebook và Discord, cho phép kết nối cộng đồng, nhắn tin, chia sẻ.\n\n**🔗 Link Demo Web:** https://socal-media-frontend.vercel.app/\n**🔗 Backend API:** https://socal-media-backend-qh5r.onrender.com/api\n**📁 Mã nguồn Backend:** https://github.com/Hongtruongbvn/socal-media-backend\n**📁 Mã nguồn Frontend:** https://github.com/Hongtruongbvn/socal-media-frontend${project2Media}`
        },
        {
          question: "Show Social Network project details",
          answer: `### 🌐 Project: Social Network (05/2025 - 10/2025)\n\n**Role:** Team Leader\n**Tech:** NestJS, React, React Native, MongoDB\n**Description:** Social media platform combining Facebook and Discord features for community connection, messaging, and sharing.\n\n**🔗 Web Demo:** https://socal-media-frontend.vercel.app/\n**🔗 Backend API:** https://socal-media-backend-qh5r.onrender.com/api\n**📁 Backend Source:** https://github.com/Hongtruongbvn/socal-media-backend\n**📁 Frontend Source:** https://github.com/Hongtruongbvn/socal-media-frontend${project2Media}`
        },
        {
          question: "Xem chi tiết dự án Bus Ticket",
          answer: `### 🚌 Dự án: Bus Ticket Management (12/2025 - 02/2026)\n\n**Vai trò:** Backend Developer\n**Công nghệ:** NestJS, React, React Native, MongoDB, Monorepo\n**Mô tả:** Nền tảng trung gian quản lý xe, lộ trình, bán vé và tự động chia hoa hồng.\n\n**📁 Mã nguồn:** https://github.com/Hongtruongbvn/bus_ticket-.git${project3Media}`
        },
        {
          question: "Show Bus Ticket project details",
          answer: `### 🚌 Project: Bus Ticket Management (12/2025 - 02/2026)\n\n**Role:** Backend Developer\n**Tech:** NestJS, React, React Native, MongoDB, Monorepo\n**Description:** Middleware platform for bus, route, ticket management with automatic commission distribution.\n\n**📁 Source Code:** https://github.com/Hongtruongbvn/bus_ticket-.git${project3Media}`
        },
        {
          question: "Xem ảnh và video dự án Mầm non",
          answer: `### 🏫 Dự án Mầm non - Hình ảnh & Video\n\n${project1Media}`
        },
        {
          question: "Show images and videos of Social Network project",
          answer: `### 🌐 Social Network Project - Images & Videos\n\n${project2Media}`
        },
        {
          question: "Show Bus Ticket images and videos",
          answer: `### 🚌 Bus Ticket Project - Images & Videos\n\n${project3Media}`
        },
        {
          question: "Xem dự án Golang và Winform",
          answer: `### ⚡ Các dự án phụ bằng Golang & C# WinForms\n\n**1. Golang Backend & DevOps:**\n- DevOps Go: https://github.com/Hongtruongbvn/back-devop\n- Go Base BE: https://github.com/Hongtruongbvn/goalnd_24-05_be\n- Go Final BE: https://github.com/Hongtruongbvn/goalnd_final_be\n\n**2. C# WinForms:**\n- Child Management: https://github.com/truongbvnedu/Child_MNG`
        },
        {
          question: "Show Golang and Winform projects",
          answer: `### ⚡ Side Projects: Golang & C# WinForms\n\n**1. Golang Backend & DevOps:**\n- DevOps Go: https://github.com/Hongtruongbvn/back-devop\n- Go Base BE: https://github.com/Hongtruongbvn/goalnd_24-05_be\n- Go Final BE: https://github.com/Hongtruongbvn/goalnd_final_be\n\n**2. C# WinForms:**\n- Child Management: https://github.com/truongbvnedu/Child_MNG`
        },
        {
          question: "Thông tin liên hệ",
          answer: `📞 **SĐT:** 0931266543\n📧 **Email:** truongtruongbvn@gmail.com\n📍 **Địa chỉ:** TP. Hồ Chí Minh\n🐙 **GitHub:** https://github.com/Hongtruongbvn\n📄 **Tải CV:** ${cvDownloadUrl}`
        },
        {
          question: "Contact information",
          answer: `📞 **Phone:** 0931266543\n📧 **Email:** truongtruongbvn@gmail.com\n📍 **Address:** Ho Chi Minh City, Vietnam\n🐙 **GitHub:** https://github.com/Hongtruongbvn\n📄 **Download CV:** ${cvDownloadUrl}`
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
    const textLower = text.toLowerCase();
    // Phát hiện tiếng Việt qua dấu câu và từ đặc trưng
    const vietnameseMarkers = ['bạn', 'là', 'của', 'và', 'có', 'không', 'xin', 'chào', 'mình', 'tôi', 'ạ', 'nhé', 'được', 'sẽ', 'cho', 'xem'];
    let vietnameseScore = 0;
    for (const marker of vietnameseMarkers) {
      if (textLower.includes(marker)) vietnameseScore++;
    }
    // Nếu có từ tiếng Việt đặc trưng thì trả về vi, ngược lại là en
    return vietnameseScore > 0 ? 'vi' : 'en';
  }

  private async findInQna(userQuestion: string): Promise<string | null> {
    const qnaList = await this.qnaService.findAll();
    const lowerQuestion = userQuestion.toLowerCase().trim();
    
    for (const qna of qnaList) {
      const lowerQnaQuestion = qna.question.toLowerCase().trim();
      // Kiểm tra trùng khớp chính xác hoặc chứa từ khóa tương tự
      if (lowerQnaQuestion === lowerQuestion || 
          lowerQuestion.includes(lowerQnaQuestion) || 
          lowerQnaQuestion.includes(lowerQuestion)) {
        return qna.answer;
      }
    }
    return null;
  }

  private handleLocalFallback(userQuestion: string): string {
    const lower = userQuestion.toLowerCase().trim();
    const baseUrl = this.getPublicUrl();
    const downloadUrl = `${baseUrl}/${this.cvFileName}`;
    const avatarUrl = `${baseUrl}/user/avatar.png`;
    const lang = this.detectLanguage(userQuestion);
    const mediaMarkdown = this.getMediaForQuestion(userQuestion);

    // Xử lý câu hỏi giới thiệu
    if (lower.includes('bạn là ai') || lower.includes('giới thiệu') || lower.includes('who are you')) {
      if (lang === 'en') {
        return `### 👨‍💻 About Pham Hong Truong\n\n![Avatar](${avatarUrl})\n\n**Name:** Pham Hong Truong\n**Education:** VTC Academy - Fullstack Development\n**Phone:** 0931266543\n**Email:** truongtruongbvn@gmail.com\n**GitHub:** https://github.com/Hongtruongbvn\n\n**Strengths:** NestJS, Laravel, React, React Native, Flutter\n\nI am a Fullstack developer passionate about building modern, optimized Web/Mobile products.`;
      }
      return `### 👨‍💻 Giới thiệu về Phạm Hồng Trưởng\n\n![Avatar](${avatarUrl})\n\n**Tên:** Phạm Hồng Trưởng (Pham Hong Truong)\n**Học vấn:** Sinh viên Học viện Công nghệ VTC (VTC Academy) chuyên ngành Fullstack Development\n**Điện thoại:** 0931266543\n**Email:** truongtruongbvn@gmail.com\n**GitHub:** https://github.com/Hongtruongbvn\n\n**Thế mạnh:** NestJS, Laravel, React, React Native, Flutter\n\nMình là lập trình viên Fullstack đam mê xây dựng các sản phẩm Web/Mobile tối ưu và hiện đại.`;
    }

    if (lower.includes('mầm non') || lower.includes('kindergarten') || lower.includes('mam non')) {
      return `### 🏫 Dự án Quản lý trường Mầm non\n\n**Vai trò:** Team Leader\n**Công nghệ:** Laravel, MySQL\n**Demo:** https://quan-ly-truong-mam-non.onrender.com/\n**GitHub:** https://github.com/Hongtruongbvn/quan_ly_truong_mam_non\n**Admin:** 0987654321 / 12345678${mediaMarkdown}`;
    }

    if (lower.includes('social') || lower.includes('mạng xã hội')) {
      return `### 🌐 Dự án Social Network\n\n**Vai trò:** Team Leader\n**Công nghệ:** NestJS, React, MongoDB\n**Demo Web:** https://socal-media-frontend.vercel.app/\n**Backend API:** https://socal-media-backend-qh5r.onrender.com/api${mediaMarkdown}`;
    }

    if (lower.includes('bus') || lower.includes('vé xe') || lower.includes('bus ticket')) {
      return `### 🚌 Dự án Bus Ticket Management\n\n**Vai trò:** Backend Developer\n**Công nghệ:** NestJS, MongoDB\n**GitHub:** https://github.com/Hongtruongbvn/bus_ticket-.git${mediaMarkdown}`;
    }

    if (lower.includes('golang') || lower.includes('winform')) {
      return `### ⚡ Dự án Golang & WinForm\n\n**Golang:**\n- DevOps: https://github.com/Hongtruongbvn/back-devop\n- Base BE: https://github.com/Hongtruongbvn/goalnd_24-05_be\n- Final BE: https://github.com/Hongtruongbvn/goalnd_final_be\n\n**C# WinForms:**\n- Child Management: https://github.com/truongbvnedu/Child_MNG`;
    }

    if (lower.includes('kỹ năng') || lower.includes('skills')) {
      if (lang === 'en') {
        return `### 🛠️ Pham Hong Truong's Skills\n\n**Frameworks:** NestJS, Laravel, React, React Native, Flutter\n**Databases:** MySQL, MongoDB, SQL Server\n**Tools:** Docker, Git, Postman, Swagger\n**Soft Skills:** Team Leader, Problem-solving`;
      }
      return `### 🛠️ Kỹ năng của Phạm Hồng Trưởng\n\n**Frameworks:** NestJS, Laravel, React, React Native, Flutter\n**Databases:** MySQL, MongoDB, SQL Server\n**Tools:** Docker, Git, Postman, Swagger\n**Soft Skills:** Team Leader, Problem-solving`;
    }

    if (lower.includes('liên hệ') || lower.includes('contact')) {
      if (lang === 'en') {
        return `### 📞 Contact Information\n\n📱 Phone: 0931266543\n📧 Email: truongtruongbvn@gmail.com\n📍 Address: Ho Chi Minh City, Vietnam\n🐙 GitHub: https://github.com/Hongtruongbvn\n📄 Download CV: ${downloadUrl}`;
      }
      return `### 📞 Thông tin liên hệ\n\n📱 SĐT: 0931266543\n📧 Email: truongtruongbvn@gmail.com\n📍 Địa chỉ: TP. Hồ Chí Minh\n🐙 GitHub: https://github.com/Hongtruongbvn\n📄 Tải CV: ${downloadUrl}`;
    }

    // Câu trả lời mặc định
    if (lang === 'en') {
      return `Hello! I am Pham Hong Truong's assistant. You can ask me about:\n- Who I am / Introduction\n- Tech skills\n- Kindergarten, Social Network, Bus Ticket projects\n- Golang, WinForm side projects\n- Contact information\n- View project images/videos\n- Download CV: ${downloadUrl}`;
    }
    return `Xin chào! Tôi là trợ lý của Phạm Hồng Trưởng. Bạn có thể hỏi tôi về:\n- Tôi là ai / Giới thiệu bản thân\n- Kỹ năng công nghệ\n- Dự án Mầm non, Social Network, Bus Ticket\n- Dự án Golang, WinForm\n- Thông tin liên hệ\n- Xem ảnh/video dự án\n- Tải CV: ${downloadUrl}`;
  }

  async askGemini(userQuestion: string): Promise<string> {
    const isEnglish = this.detectLanguage(userQuestion) === 'en';
    const baseUrl = this.getPublicUrl();
    const cvDownloadUrl = `${baseUrl}/${this.cvFileName}`;
    const mediaMarkdown = this.getMediaForQuestion(userQuestion);
    
    try {
      // Kiểm tra trong database trước
      const qnaAnswer = await this.findInQna(userQuestion);
      if (qnaAnswer) {
        console.log(`[QnA Match] Tìm thấy câu trả lời trong database cho: "${userQuestion}"`);
        // Thêm media nếu cần
        if ((userQuestion.toLowerCase().includes('ảnh') || userQuestion.toLowerCase().includes('image') || 
             userQuestion.toLowerCase().includes('video')) && mediaMarkdown) {
          return qnaAnswer + mediaMarkdown;
        }
        return qnaAnswer;
      }

      const qnaList = await this.qnaService.findAll();
      const qnaKnowledge = qnaList
        .map((item, index) => `${index + 1}. Q: "${item.question}" -> A: "${item.answer}"`)
        .join('\n');

      const systemInstruction = this.getSystemInstruction(isEnglish ? 'en' : 'vi');

      for (const modelName of this.MODEL_PREFERENCE) {
        let delay = 1000;
        const maxRetries = 2;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            console.log(`[AI Request] Model: ${modelName} | Lang: ${isEnglish ? 'EN' : 'VI'} | Attempt: ${attempt}/${maxRetries}`);
            
            let finalQuestion = userQuestion;
            
            if ((userQuestion.toLowerCase().includes('ảnh') || userQuestion.toLowerCase().includes('image') || 
                 userQuestion.toLowerCase().includes('hình') || userQuestion.toLowerCase().includes('video') || 
                 userQuestion.toLowerCase().includes('show') || userQuestion.toLowerCase().includes('xem')) && mediaMarkdown) {
              finalQuestion = userQuestion + '\n\n' + mediaMarkdown;
            }
            
            const response = await this.ai.models.generateContent({
              model: modelName,
              contents: finalQuestion,
              config: { systemInstruction, temperature: 0.3 },
            });

            if (response && response.text) {
              let result = response.text;
              if ((userQuestion.toLowerCase().includes('ảnh') || userQuestion.toLowerCase().includes('image') || 
                   userQuestion.toLowerCase().includes('video')) && mediaMarkdown && !result.includes('![')) {
                result += '\n\n' + mediaMarkdown;
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