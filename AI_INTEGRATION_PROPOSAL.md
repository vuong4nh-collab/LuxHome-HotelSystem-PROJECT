# 🏨 Kế Hoạch & Ý Tưởng Tích Hợp AI Vào Hệ Thống LuxStay Hotel Management

Tài liệu này đề xuất chiến lược, kiến trúc kỹ thuật và lộ trình chi tiết để tích hợp Trí tuệ nhân tạo (AI) vào hệ thống Quản lý Khách sạn **LuxStay**. Mục tiêu là nâng cao trải nghiệm khách hàng (Customer Experience), tối ưu hiệu suất vận hành cho nhân viên (Operational Efficiency), và gia tăng doanh thu (Revenue Optimization).

---

## 🎯 1. Bản Đồ Ý Tưởng Tích Hợp AI (AI Feature Matrix)

Hệ thống LuxStay hiện tại có 2 phân hệ người dùng chính: **Khách hàng (Customer PWA)** và **Nhân viên / Quản lý (Staff Web Dashboard)**. Dưới đây là các tính năng AI giá trị cao nhất được phân loại theo từng đối tượng:

```
                                 ┌──────────────────────────────────────────────┐
                                 │      LUXSTAY AI ECOSYSTEM ARCHITECTURE       │
                                 └──────────────────────┬───────────────────────┘
                                                        │
                      ┌─────────────────────────────────┴─────────────────────────────────┐
                      │                                                                   │
           ┌──────────▼──────────┐                                             ┌──────────▼──────────┐
           │   CUSTOMER PWA      │                                             │   STAFF DASHBOARD   │
           │ (Khách Hàng)        │                                             │ (Lễ Tân / Quản Lý)  │
           └──────────┬──────────┘                                             └──────────┬──────────┘
                      │                                                                   │
     ┌────────────────┼────────────────┐                                 ┌────────────────┼────────────────┐
     ▼                ▼                ▼                                 ▼                ▼                ▼
[1. AI Concierge [2. eKYC & OCR   [3. Smart Room                   [4. Receptionist [5. Dynamic Pricing [6. AI BI &
  24/7 Chatbot]   CCCD/Passport]    Voice/Order]                     Copilot]         & Forecasting]     Analytics]
```

### Phân Hệ 1: Dành Cho Khách Hàng (Customer PWA)

| STT | Tính Năng | Mô Tả Chi Tiết | Công Nghệ Khuyên Dùng | Giá Trị Mang Lại |
|---|---|---|---|---|
| **1.1** | **AI Virtual Concierge (Trợ lý lễ tân ảo 24/7)** | Chatbot thông minh giải đáp mọi thắc mắc về khách sạn (giờ ăn sáng, mật khẩu wifi, dịch vụ spa, menu nhà hàng), gợi ý lịch trình du lịch cá nhân hóa. Hỗ trợ đa ngôn ngữ (Việt, Anh, Hàn, Trung, Nhật). | LLM (Gemini 1.5 Flash / GPT-4o-mini) + RAG (Vector DB) | Giảm 70% cuộc gọi hỏi thông tin đến quầy lễ tân; phục vụ khách quốc tế không rào cản ngôn ngữ. |
| **1.2** | **Đặt Phòng Bằng Ngôn Ngữ Tự Nhiên (Conversational Booking)** | Khách chỉ cần nhắn: *"Tìm phòng đôi có bồn tắm cho 2 người lớn từ 20 đến 22 tháng này giá dưới 2 triệu"* -> AI tự trích xuất thông tin, gọi API tìm phòng phù hợp và gửi link đặt ngay. | LLM Function Calling / Tool Use + Backend API Booking | Tăng tỷ lệ chuyển đổi đặt phòng trực tiếp (Direct Booking), không phụ thuộc vào OTA. |
| **1.3** | **Check-in Tự Động Với OCR CCCD / Hộ Chiếu (eKYC)** | Khách chụp ảnh CCCD hoặc Hộ chiếu tải lên PWA -> AI tự động bóc tách: Họ tên, Ngày sinh, Số giấy tờ, Địa chỉ -> Điền sẵn vào form check-in. | Gemini 1.5 Flash Vision / Google Cloud Vision API | Khách check-in trong 30 giây, không phải đứng xếp hàng chờ quét giấy tờ tại quầy. |
| **1.4** | **Smart In-Room Service Voice/Text Order** | Khách nhắn tin hoặc bấm nút nói trên điện thoại: *"Cho tôi thêm 2 chai nước và 1 phần beefsteak medium rare lên phòng"* -> AI tự tạo đơn dịch vụ vào hệ thống kèm đúng mã phòng. | Speech-to-Text (Whisper / Web Speech API) + NLP Intent Extraction | Trải nghiệm dịch vụ 5 sao thông minh, hiện đại. |

---

### Phân Hệ 2: Dành Cho Nhân Viên & Quản Trị (Staff Web Dashboard)

| STT | Tính Năng | Mô Tả Chi Tiết | Công Nghệ Khuyên Dùng | Giá Trị Mang Lại |
|---|---|---|---|---|
| **2.1** | **AI Receptionist Copilot (Trợ lý đắc lực cho Lễ tân)** | Tự động tóm tắt hồ sơ khách khi check-in: sở thích, các ghi chú từ lần lưu trú trước (dị ứng, thích tầng cao), tự động sinh email/tin nhắn chào mừng cá nhân hóa. | LLM Summarization & Generation | Nâng tầm dịch vụ cá nhân hóa (Personalized Luxury Service). |
| **2.2** | **Phân Tích Đánh Giá & Gợi Ý Phản Hồi (Review Sentiment AI)** | AI quét toàn bộ đánh giá của khách trên PWA, Google Reviews, Booking.com -> Phân loại cảm xúc (Tích cực/Tiêu cực), cảnh báo ngay nếu có sự cố phòng bẩn/phục vụ chậm, gợi ý sẵn câu trả lời lịch thiệp. | NLP Sentiment Analysis + Text Generation | Bảo vệ uy tín thương hiệu, xử lý khủng hoảng khách hàng tức thì. |
| **2.3** | **Định Giá Phòng Linh Hoạt (Dynamic Pricing AI)** | Dự đoán nhu cầu đặt phòng dựa vào: lịch sử lấp đầy, ngày lễ/cuối tuần, mùa cao điểm, sự kiện tại địa phương -> Đề xuất giá phòng tối ưu theo ngày để tối đa hóa doanh thu (RevPAR). | Time-series Machine Learning (Prophet / XGBoost) hoặc LLM Reasoning Rules | Tăng 15 - 25% doanh thu phòng so với giá cố định truyền thống. |
| **2.4** | **AI Query & Trợ Lý Báo Cáo Doanh Thu (Text-to-SQL / AI BI)** | Quản lý có thể gõ hoặc hỏi trực tiếp: *"So sánh doanh thu tuần này với tuần trước"*, *"Phòng nào có doanh thu dịch vụ minibar cao nhất?"* -> AI tự chuyển thành truy vấn CSDL và hiển thị biểu đồ phân tích. | LLM Text-to-SQL (Semantic Layer có kiểm soát quyền bảo mật) | Tiết kiệm thời gian xuất file Excel/báo cáo thủ công cho ban giám đốc. |
| **2.5** | **AI Tối Ưu Lịch Buồng Phòng (Smart Housekeeping Dispatch)** | Tự động dự đoán thời gian dọn phòng dựa trên loại phòng và phân công dọn dẹp tối ưu theo tầng và giờ check-in dự kiến của khách mới. | Thuật toán tối ưu hóa lịch trình (Heuristic / Constraint Satisfaction) | Giảm thời gian chờ nhận phòng của khách giờ cao điểm. |

---

## 🏗️ 2. Kiến Trúc Kỹ Thuật Đề Xuất (Technical Architecture)

Để tích hợp AI mà **không làm xáo trộn kiến trúc Node.js / Express sẵn có** của LuxStay, chúng ta xây dựng thêm module `ai` theo mô hình Service-Oriented:

```
[ FRONTEND ]
  ├── Staff Web (React)      ──┐
  │   ├── AI Assistant Chat    │
  │   ├── Smart Pricing Widget │
  │   └── OCR Preview Modal    │
  │                            ├──> [ REST API / WebSocket ]
  └── Customer PWA (React)    │
      ├── Concierge Bot Modal  │
      └── ID Card Scanner Cam ─┘
                                   │
                                   ▼
[ BACKEND (Node.js Express) ]
  ├── src/modules/ai/
  │   ├── ai.routes.js          <-- Định tuyến endpoint AI (/api/ai/...)
  │   ├── ai.controller.js      <-- Xử lý request, validate input, auth
  │   ├── ai.service.js         <-- Điều phối LLM, RAG, Prompt, Cache
  │   └── prompts/              <-- System Prompts chuẩn hóa theo từng nghiệp vụ
  │       ├── concierge.prompt.js
  │       ├── ocr.prompt.js
  │       └── pricing.prompt.js
  │
  ├── [ AI EXTERNAL ENGINES ]
  │   ├── Google Gemini API (Gemini 1.5 Flash)    <-- Siêu nhanh, rẻ, hỗ trợ Multimodal (Ảnh + Text)
  │   └── Local / Hosted Vector Store (ChromaDB / Pinecone / pgvector)
  │
  └── [ KNOWLEDGE BASE (RAG) ]
      ├── Quy định khách sạn (Hotel Policies)
      ├── Menu dịch vụ (Food, Drink, Spa, Tour)
      └── Địa điểm du lịch, ẩm thực lân cận
```

---

## 💻 3. Thiết Kế API Cho Module AI (Backend Endpoints)

Module AI sẽ được cấu trúc trong `backend/src/modules/ai/` với các endpoint sau:

### 1. `POST /api/ai/concierge/chat`
- **Mục đích**: Nhận tin nhắn của khách và trả lời dựa trên thông tin phòng, tiện ích khách sạn (RAG).
- **Request Body**:
  ```json
  {
    "conversationId": "uuid-optional",
    "message": "Phòng của tôi có kèm ăn sáng không và nhà hàng ở tầng mấy?",
    "bookingId": 12, // Tùy chọn, để AI biết ngữ cảnh phòng khách đang ở
    "language": "vi"
  }
  ```
- **Response**:
  ```json
  {
    "reply": "Chào quý khách! Hạng phòng Deluxe của quý khách đã bao gồm buffet sáng miễn phí tại Nhà hàng Ocean Palace ở Tầng 2, phục vụ từ 06:00 đến 10:00 hàng ngày ạ.",
    "suggestedActions": [
      { "label": "Xem thực đơn ăn sáng", "action": "OPEN_MENU" },
      { "label": "Gọi dịch vụ phòng", "action": "ORDER_SERVICE" }
    ]
  }
  ```

### 2. `POST /api/ai/ocr/id-card`
- **Mục đích**: Quét CCCD hoặc Hộ chiếu từ ảnh chụp để tự động điền form Check-in / Khách hàng.
- **Request**: `multipart/form-data` chứa file ảnh mặt trước (+ mặt sau) giấy tờ.
- **Response**:
  ```json
  {
    "fullName": "NGUYỄN VĂN AN",
    "idNumber": "001095012345",
    "dateOfBirth": "1995-08-15",
    "gender": "Nam",
    "address": "Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
    "nationality": "Việt Nam",
    "confidenceScore": 0.98
  }
  ```

### 3. `POST /api/ai/pricing/recommend`
- **Mục đích**: Đề xuất mức giá phòng tối ưu cho lễ tân/quản lý dựa vào ngày lưu trú, tỷ lệ phòng trống và nhu cầu thị trường.
- **Request Body**:
  ```json
  {
    "roomTypeId": 2,
    "targetDate": "2026-09-20"
  }
  ```
- **Response**:
  ```json
  {
    "currentBasePrice": 1200000,
    "recommendedPrice": 1450000,
    "adjustmentPercent": "+20.8%",
    "reasoning": "Cuối tuần + Tỷ lệ lấp đầy toàn khách sạn đã đạt 78% + Có sự kiện lễ hội âm nhạc tại địa phương."
  }
  ```

### 4. `POST /api/ai/analytics/ask`
- **Mục đích**: Hỗ trợ Giám đốc / Quản lý hỏi đáp trực tiếp số liệu kinh doanh khách sạn.
- **Request Body**:
  ```json
  {
    "query": "Tháng này loại phòng nào bán chạy nhất và tỷ lệ huỷ phòng là bao nhiêu?"
  }
  ```
- **Response**:
  ```json
  {
    "answer": "Tháng 09/2026, phòng Deluxe Ocean View dẫn đầu với 45 lượt đặt (chiếm 38% tổng doanh thu). Tỷ lệ hủy phòng toàn hệ thống hiện ở mức thấp: 4.2%.",
    "chartData": {
      "type": "bar",
      "labels": ["Deluxe Ocean", "Suite VIP", "Standard King"],
      "values": [45, 28, 20]
    }
  }
  ```

---

## 🚀 4. Lộ Trình Triển Khai Theo Từng Giai Đoạn (Roadmap)

### 🔹 Giai đoạn 1: Quick-Win (Triển khai trong 1 - 2 tuần)
> **Mục tiêu**: Đem lại tính năng AI trực quan tức thì cho người dùng với chi phí thấp nhất.

1. **AI Chatbot Concierge trên Customer PWA**:
   - Sử dụng **Google Gemini 1.5 Flash API** (miễn phí quota lớn hoặc chi phí cực rẻ ~$0.075 / 1 triệu token).
   - Nạp thông tin khách sạn (FAQ, dịch vụ, menu, chính sách nhận/trả phòng) vào System Prompt (Prompt-based RAG đơn giản).
   - Tích hợp giao diện Chat Widget nổi ở góc dưới màn hình Customer PWA.
2. **AI Quét CCCD / Hộ Chiếu (OCR) khi Check-in**:
   - Gắn nút "Chụp/Tải CCCD" tại màn hình Check-in (Staff Web) và trang Đặt phòng (Customer PWA).
   - Gemini Vision đọc thông tin và tự động điền vào form đặt phòng trong 2 giây.

### 🔹 Giai đoạn 2: Tối Ưu Vận Hành Cho Nhân Viên (Triển khai trong 2 - 3 tuần)
> **Mục tiêu**: Giảm tải thao tác tay cho Lễ tân và Quản lý.

1. **Smart Guest Profile (Tóm tắt hồ sơ khách hàng)**:
   - Khi lễ tân mở chi tiết đặt phòng, AI tự động tổng hợp: Khách ở bao nhiêu lần, chi tiêu trung bình, thói quen ăn uống, ghi chú đặc biệt.
2. **AI Sentiment & Review Assistant**:
   - Tự động phân tích phản hồi của khách sau khi check-out, gắn cờ cảnh báo phòng/dịch vụ bị phàn nàn.
   - Gợi ý câu trả lời phản hồi tự động chuẩn mực phong cách 5 sao.

### 🔹 Giai đoạn 3: Nâng Cao & Tối Ưu Doanh Thu (Triển khai trong 3 - 4 tuần)
> **Mục tiêu**: Ra quyết định dựa trên dữ liệu & Tối ưu hóa lợi nhuận.

1. **AI Dynamic Pricing (Định giá phòng tự động)**:
   - Xây dựng thuật toán kết hợp phân tích xu hướng lấp đầy phòng quá khứ và dự báo tương lai.
2. **AI BI Query (Trợ lý hỏi đáp số liệu Quản trị)**:
   - Tích hợp tính năng hỏi đáp số liệu kinh doanh trên Dashboard bằng tiếng Việt tự nhiên.

---

## 💰 5. Dự Toán Chi Phí & Lựa Chọn Công Nghệ

| Thành Phần | Giải Pháp Đề Xuất | Chi Phí Dự Kiến | Ưu Điểm |
|---|---|---|---|
| **Mô hình AI chính** | **Google Gemini 1.5 Flash** | ~0$ (bản Free Tier: 15 RPM) hoặc dưới $5 - $10 / tháng khi sản xuất | Tốc độ siêu nhanh (<1s), hỗ trợ tiếng Việt xuất sắc, xử lý được cả hình ảnh (Multimodal OCR), chi phí rẻ nhất thị trường. |
| **Cơ sở dữ liệu Vector (RAG)** | In-memory embedding hoặc **ChromaDB / SQLite Vector** | Miễn phí (chạy trực tiếp trên server) | Đơn giản, không phát sinh chi phí hạ tầng cloud riêng. |
| **Bảo mật dữ liệu (Data Privacy)** | Thiết kế Masking dữ liệu nhạy cảm trước khi gửi sang AI (ẩn số thẻ ngân hàng, số điện thoại riêng tư) | 0$ | Đảm bảo an toàn thông tin khách hàng tuân thủ quy định bảo mật. |

---

## 📋 6. Kế Hoạch Bắt Đầu Ngay

Nếu bạn muốn bắt đầu tích hợp ngay bây giờ, các bước kỹ thuật đầu tiên sẽ là:
1. **Đăng ký Gemini API Key** (tại [Google AI Studio](https://aistudio.google.com/)).
2. **Cài đặt thư viện AI trong Backend**:
   ```bash
   cd backend
   npm install @google/genai
   ```
3. **Thêm biến môi trường vào `.env`**:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
4. **Tạo module `backend/src/modules/ai/`** với tính năng đầu tiên: **AI Concierge Chatbot** hoặc **AI OCR CCCD Check-in**.
