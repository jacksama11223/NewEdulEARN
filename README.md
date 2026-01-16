
# 🌌 EDULEARN - Gamified AI Learning Management System

Hệ thống quản lý học tập (LMS) thế hệ mới, kết hợp sức mạnh của **Google Gemini 3.0 (Thinking Mode)**, **Gamification** (Game hóa), và mô phỏng kiến trúc **Microservices**. Dự án biến việc học thành một cuộc phiêu lưu vũ trụ, nơi sinh viên không chỉ học mà còn "cày cuốc", giao dịch và chiến đấu với kiến thức.

---

## 🛠️ Yêu Cầu Hệ Thống (Prerequisites)

Để chạy dự án, bạn cần cài đặt:

1.  **Node.js**: Phiên bản 18 trở lên.
2.  **MongoDB**:
    *   **Option A (Dễ nhất):** Cài đặt [MongoDB Community Server](https://www.mongodb.com/try/download/community) chạy trên máy cá nhân.
    *   **Option B:** Dùng MongoDB Atlas (Cloud).
3.  **Google Gemini API Key**:
    *   Truy cập [Google AI Studio](https://aistudio.google.com/).
    *   Tạo API Key mới (Miễn phí).

---

## 🚀 Hướng Dẫn Cài Đặt (Setup Guide)

Dự án gồm 2 phần riêng biệt: **Backend** (API/Database) và **Frontend** (Giao diện). Bạn cần chạy cả hai terminal song song.

### 1️⃣ Cài đặt & Chạy Backend

1.  Mở terminal, đi vào thư mục backend:
    ```bash
    cd backend
    ```
2.  Cài đặt thư viện:
    ```bash
    npm install
    ```
3.  **Quan trọng:** Tạo file `.env` trong thư mục `backend/` và dán nội dung sau:
    ```env
    PORT=5000
    # Nếu dùng MongoDB cài trên máy:
    MONGODB_URI=mongodb://127.0.0.1:27017/lms_db
    # Điền Key Gemini của bạn vào đây:
    API_KEY=AIzaSy...YOUR_GEMINI_KEY_HERE
    ```
4.  **Khởi tạo dữ liệu mẫu (Seed Data):**
    *   Lệnh này sẽ xóa dữ liệu cũ và tạo lại các tài khoản/khóa học mặc định.
    ```bash
    npm run seed
    ```
5.  Khởi động Server:
    ```bash
    npm run dev
    ```
    *Server sẽ chạy tại: `http://localhost:5000`*

### 2️⃣ Cài đặt & Chạy Frontend

1.  Mở một terminal **mới**, đi vào thư mục gốc của dự án (nơi chứa file `vite.config.ts`):
    ```bash
    # Nếu đang ở thư mục backend thì gõ: cd ..
    ```
2.  Cài đặt thư viện:
    ```bash
    npm install
    ```
3.  Khởi động giao diện:
    ```bash
    npm run dev
    ```
    *Frontend sẽ chạy tại: `http://localhost:3000`*

---

## 🔐 Tài Khoản Demo (Accounts)

Mật khẩu mặc định cho tất cả tài khoản là: `1`

| Role | Username | Password | Chức năng chính |
| :--- | :--- | :--- | :--- |
| **Sinh Viên** | `sv001` | `1` | Học tập, Làm Quiz, Gamification, Chat, AI Student. |
| **Giáo Viên** | `gv001` | `1` | Quản lý lớp, Chấm điểm, AI Teacher, Soạn bài. |
| **Admin** | `qt001` | `1` | Quản lý hệ thống, Resilience, Security, Canary Deploy. |

---

## 📘 Hướng Dẫn Sử Dụng Chi Tiết (Feature Flows)

### 1. 👨‍🎓 Luồng Sinh Viên (Student Flow)

#### A. Dashboard & Khám Phá (Trạm Vũ Trụ)
*   **Orbital Cards (Hành tinh môn học):**
    *   Mỗi thẻ là một môn học. Vòng tròn năng lượng (Pin) hiển thị mức độ chăm chỉ. Nếu bỏ bê quá lâu, hành tinh sẽ phát tín hiệu **SOS**.
    *   **Chuột phải (Right-click):** Chọn *"Khai thác (Summarize)"* để AI tóm tắt kiến thức đã học thành "Báo cáo tình báo" và lưu vào sổ tay.
*   **Space Junk (Rác Vũ Trụ):**
    *   Đôi khi bạn thấy icon rác (🛰️, ☄️) trôi qua màn hình. Hãy nhanh tay bấm vào để nhặt.
    *   Vào **Cửa Hàng (Shop)** -> Tab **Tái Chế** để đổi rác lấy XP.
*   **Study Buddy (Thú Cưng AI):**
    *   Con mèo/rồng ở góc màn hình sẽ phản ứng theo hành động của bạn (gõ phím, nghe nhạc, scroll). Bấm vào nó để nựng (Poke).

#### B. Learning Path (Cây Tri Thức - Duolingo Style)
*   **Truy cập:** Menu "Cây Tri Thức" -> "Khởi tạo lộ trình mới".
*   **Quy trình:**
    1.  Nhập chủ đề muốn học (hoặc import từ Notebook).
    2.  Làm bài **Placement Test** (Kiểm tra đầu vào) để AI xếp lớp.
    3.  **AI Generation:** Hệ thống tạo ra cây kỹ năng (Skill Tree).
    4.  **Học tập:**
        *   *Flashcards:* AI tạo thẻ nhớ tự động từ chủ đề. Học theo cơ chế lặp lại ngắt quãng (SRS).
        *   *Boss Exam:* Phải thuộc >10 thẻ mới mở khóa bài kiểm tra qua màn.
        *   *Treasure Node:* Giải câu đố Riddle của AI để mở rương báu.
        *   *Gatekeeper:* Thi vượt cấp để nhảy cóc bài học.

#### C. Notebook & Note Doctor (Sổ Tay Thông Minh)
*   **Soạn thảo:** Hỗ trợ Markdown, chèn link nội bộ `[[Tên Note]]`.
*   **AI Tools:**
    *   *Note Doctor:* AI quét toàn bộ database để tìm mối liên hệ (Connections) giữa ghi chú hiện tại và các ghi chú cũ.
    *   *Oracle Refine:* Viết lại văn phong học thuật.
    *   *Convert to Lesson:* Biến ghi chú nháp thành bài giảng hoàn chỉnh (chỉ dành cho GV/Admin).
*   **Intel Sharing (Kinh tế tri thức):**
    *   Bấm nút 📡 để chia sẻ note cho Phi đội (Group).
    *   Note sẽ bị khóa (Encrypted). Thành viên khác phải trả XP để mở khóa -> Bạn nhận được XP hoa hồng.

#### D. Nhiệm vụ & Gamification
*   **Assignment Hub:** Nơi nhận bài tập.
    *   *AI Commander:* Gợi ý chiến thuật làm bài tập khó.
    *   *Boss Raid:* Bài tập Rank S. Có thể rủ bạn bè (Raid Party) cùng làm để tăng tỷ lệ đậu.
*   **Phoenix Ritual (Nghi lễ Hồi sinh):**
    *   Nếu bạn mất chuỗi (Streak), hệ thống cho phép làm một bài **Speed Run** (trả lời đúng 100% trong 60s) để hồi sinh chuỗi.

### 2. 👩‍🏫 Luồng Giáo Viên (Teacher Flow)

#### A. Gemini Teacher (Trợ Giảng Ảo)
*   **Truy cập:** Menu "Trợ giảng AI".
*   **Chức năng:**
    *   **Persona:** Cấu hình tính cách cho AI (Nghiêm khắc, Hài hước, Socratic).
    *   **Deploy Lesson:** Chat với AI để soạn nội dung. Nếu ưng ý, bấm nút **"🚀 Deploy"** để đẩy thẳng nội dung đó vào khóa học thực tế cho sinh viên học.
    *   **Issue Challenge:** Ra lệnh cho AI tạo một "Boss Challenge" (Bài tập khó) và gửi thông báo thách đấu cho cả lớp.

#### B. Assignment & Grading (Chấm Điểm)
*   **Speed Grading:** Chấm bài nộp (File). Có thể xem file giả lập và nhập điểm/nhận xét nhanh.
*   **Intervention (Can thiệp):**
    *   Vào tab "Phân tích câu hỏi". Nếu thấy một câu hỏi có nhiều người sai, bấm **"👨‍🏫 Giảng lại"**.
    *   AI (Jester Persona) sẽ soạn một lời giải thích thú vị và gửi thông báo riêng cho những em làm sai câu đó.

#### C. Class Tree (Cây Lớp Học)
*   Xem tiến độ của cả lớp dưới dạng Cây Kỹ Năng tổng hợp. Node nào màu đỏ nghĩa là cả lớp đang "kẹt" -> Cần giảng lại.

### 3. 🛡️ Luồng Admin (System Ops)

#### A. Resilience (Quản lý Độ Ổn Định)
*   **Giả lập sự cố:** Dashboard -> Resilience.
*   **Thao tác:** Thử tắt (chuyển sang CRITICAL) các service như `grading_service` hoặc `ai_service`.
*   **Hệ quả:** Quay lại giao diện Giáo viên/Sinh viên sẽ thấy các nút chức năng tương ứng bị mờ đi (Graceful Degradation) thay vì sập toàn bộ web.

#### B. Canary Deployment (Phát hành thử nghiệm)
*   **Truy cập:** Dashboard -> Deployment.
*   **Feature Flags:** Bật/tắt tính năng mới (ví dụ: Chat v2, Gamification v4) cho riêng một nhóm người dùng cụ thể (nhập ID: `sv001`) để test trước khi bung ra toàn server.

---

## 🛠️ Xử Lý Sự Cố Thường Gặp (Troubleshooting)

1.  **Lỗi "API Key Missing":**
    *   Kiểm tra xem file `.env` đã có `API_KEY` chưa.
    *   Restart lại backend (`Ctrl+C` rồi `npm run dev`).
    *   Nếu trên giao diện vẫn báo lỗi, bấm vào biểu tượng 🔑 trên thanh Header và nhập key trực tiếp.

2.  **Lỗi "Network Error" / Load mãi không xong:**
    *   Đảm bảo Backend đang chạy ở port 5000.
    *   Kiểm tra MongoDB đã bật chưa.

3.  **Lỗi đăng nhập:**
    *   Chạy lại `npm run seed` để reset tài khoản về mặc định.

---

**Chúc bạn có trải nghiệm thú vị với EDULEARN! 🚀**
