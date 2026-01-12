
# 🌌 EDULEARN - Gamified AI Learning Management System (LMS)

Một hệ thống quản lý học tập (LMS) thế hệ mới, tích hợp sâu **Google Gemini AI**, **Gamification** (Game hóa), và kiến trúc **Microservices Simulation**. Dự án này không chỉ là một LMS thông thường mà còn là một nền tảng xã hội học tập với các tính năng như phi đội, giao dịch vật phẩm, và trợ giảng AI đa nhân cách.

---

## 🛠️ Yêu cầu cài đặt (Prerequisites)

Để chạy dự án này, bạn cần cài đặt:

1.  **Node.js** (v18 trở lên).
2.  **MongoDB**: Bạn có thể cài MongoDB Community Server (Local) hoặc dùng MongoDB Atlas (Cloud).
3.  **Google Gemini API Key**: Lấy tại [Google AI Studio](https://aistudio.google.com/).

---

## 🚀 Hướng dẫn Cài đặt & Chạy (Setup Guide)

Dự án bao gồm 2 phần: **Backend** (API Server) và **Frontend** (React App). Bạn cần chạy cả hai.

### Bước 1: Cấu hình & Chạy Backend

1.  Mở terminal, di chuyển vào thư mục backend:
    ```bash
    cd backend
    ```
2.  Cài đặt dependencies:
    ```bash
    npm install
    ```
3.  Tạo file `.env` trong thư mục `backend/` và điền thông tin sau:
    ```env
    PORT=5000
    MONGODB_URI=mongodb://localhost:27017/lms_db  # Hoặc connection string của MongoDB Atlas
    API_KEY=YOUR_GEMINI_API_KEY_HERE            # Key Gemini của bạn để chạy AI
    ```
4.  Khởi tạo dữ liệu mẫu (Seed Data) - **Bước quan trọng để có tài khoản đăng nhập**:
    ```bash
    npm run seed
    ```
    *(Lệnh này sẽ tạo các tài khoản mẫu: sv001, gv001, qt001 với mật khẩu là '1')*

5.  Khởi động Server:
    ```bash
    npm run dev
    ```
    *Server sẽ chạy tại: `http://localhost:5000`*

### Bước 2: Cấu hình & Chạy Frontend

1.  Mở một terminal mới, quay lại thư mục gốc (root) của dự án:
    ```bash
    # Nếu đang ở thư mục backend
    cd ..
    ```
2.  Cài đặt dependencies:
    ```bash
    npm install
    ```
3.  Khởi động ứng dụng React:
    ```bash
    npm run dev
    ```
    *Frontend sẽ chạy tại: `http://localhost:3000`*

---

## 🔐 Tài khoản Demo (Default Credentials)


| Role | Username | Password | Mô tả |
| :--- | :--- | :--- | :--- |
| **Học sinh** | `sv001` | `1` | Trải nghiệm đầy đủ tính năng học tập, game, chat. |
| **Giáo viên** | `gv001` | `1` | Quản lý bài tập, chấm điểm, soạn giáo án AI. |
| **Admin** | `qt001` | `1` | Quản lý hệ thống, Resilience, Security. |

---

## 📘 Hướng dẫn Sử dụng & Luồng Component (Component Flows)

Dưới đây là hướng dẫn chi tiết cách sử dụng các tính năng chính của ứng dụng.

### 1. 🎓 Luồng Học Sinh (Student Flow)

#### A. Dashboard (Trạm Vũ Trụ)
*   **Vị trí:** Trang chủ sau khi đăng nhập.
*   **Tính năng:**
    *   **Khóa học (Orbital Cards):** Các hành tinh đại diện cho môn học. Di chuột vào để xem trạng thái năng lượng. Click chuột phải để "Khai thác tài nguyên" (AI Summarize).
    *   **Focus Timer:** Widget góc phải dưới. Bấm Start để bật chế độ tập trung (Deep Work). Khi hết giờ, hệ thống gợi ý Break Activity (Quiz/Flashcard).
    *   **Space Junk:** Nếu thấy icon rác vũ trụ trôi qua màn hình, hãy bấm vào để nhặt và nhận XP.

#### B. Learning Path (Lộ trình học AI - Duolingo Style)
*   **Truy cập:** Menu "Cây Tri Thức" -> Nút "Khởi tạo lộ trình mới".
*   **Luồng:**
    1.  Nhập chủ đề muốn học (hoặc dán nội dung từ Notebook).
    2.  Chọn mục tiêu và thời gian cam kết.
    3.  Làm bài Test đầu vào (Placement Test) để AI xếp lớp.
    4.  **AI Generation:** Hệ thống tạo ra cây kỹ năng (Skill Tree).
    5.  **Học tập:** Bấm vào từng Node để học.
        *   *Flashcards:* AI tạo thẻ nhớ tự động.
        *   *Exam:* Làm bài kiểm tra để mở khóa Node tiếp theo.
        *   *Treasure Node:* Giải câu đố Riddle để nhận Skin/Kim cương.

#### C. Notebook & Note Doctor (Sổ tay thông minh)
*   **Truy cập:** Menu "Sổ Tay".
*   **Luồng:**
    1.  Tạo ghi chú mới.
    2.  **Note Doctor:** Bấm nút "🩺 Note Doctor", AI sẽ quét các ghi chú khác của bạn để tìm mối liên hệ (Links) giữa các kiến thức.
    3.  **Chia sẻ:** Bấm nút 📡 để chia sẻ ghi chú cho Phi đội. Bạn nhận XP mỗi khi có người đọc.

#### D. Gemini Student (Nhà Tiên Tri)
*   **Truy cập:** Menu "Nhà Tiên Tri".
*   **Tính năng:**
    *   Chat với AI theo các nhân cách: *The Oracle* (Hàn lâm), *The Jester* (Hài hước), *The Commander* (Ngắn gọn).
    *   Upload ảnh/PDF để AI phân tích hoặc tạo Flashcards tức thì.

### 2. 👩‍🏫 Luồng Giáo Viên (Teacher Flow)

#### A. Assignment Hub & Grading
*   **Truy cập:** Menu "Quản lý Bài tập".
*   **Luồng:**
    1.  Tạo bài tập mới (File hoặc Quiz). Có thể dùng AI để tự động soạn câu hỏi Quiz từ chủ đề.
    2.  Vào chấm điểm (Grading).
    3.  **Intervention:** Nếu thấy nhiều học sinh sai cùng một câu, bấm nút "Giảng lại". AI (Jester) sẽ soạn một lời giải thích thú vị và gửi thông báo cho nhóm học sinh đó.

#### B. Gemini Teacher (Trợ giảng AI)
*   **Truy cập:** Menu "Trợ giảng AI".
*   **Tính năng:**
    *   Soạn giáo án, tạo đề thi.
    *   **Deploy Lesson:** Sau khi AI tạo nội dung, bấm "🚀 Deploy" để đẩy thẳng nội dung đó vào khóa học thực tế.
    *   **Boss Challenge:** Tạo nhiệm vụ khó (Rank S) để thách thức học sinh.

### 3. 🛡️ Luồng Admin (System Operations)

#### A. Resilience Page (Quản lý Độ ổn định)
*   **Truy cập:** Dashboard -> Quản lý độ ổn định.
*   **Tính năng:** Giả lập sự cố hệ thống. Bạn có thể tắt/bật các Microservices (ví dụ: tắt `grading_service`).
    *   *Thử nghiệm:* Tắt `grading_service`, sau đó quay lại tài khoản Giáo viên. Bạn sẽ thấy nút chấm điểm bị vô hiệu hóa (Graceful Degradation).

#### B. Security (An ninh)
*   **Tính năng:** Xem log tấn công giả lập (WAF Logs), khóa tài khoản người dùng, gửi thông báo toàn hệ thống.

---

## 🎮 Gamification & Social Features

*   **Shop & Inventory:** Sử dụng XP và Kim cương kiếm được để mua Skin (giao diện) và Pet (thú cưng).
    *   *Lưu ý:* Một số Lộ trình học (Learning Path) sẽ gợi ý Skin phù hợp (ví dụ: học Tiếng Nhật gợi ý Skin Hoa Anh Đào).
*   **Squadron (Phi đội):** Chat nhóm.
    *   **SOS:** Gửi tín hiệu cấp cứu khi gặp bài khó. Người giải cứu nhận Karma.
    *   **Data Heist:** Chia sẻ tài liệu (Intel) để nhận thưởng.
*   **Leaderboard:** Bảng xếp hạng thi đua. Có thể thách đấu (Raid) người khác.

---

## ⚠️ Khắc phục sự cố thường gặp

1.  **Lỗi "API Key Missing":**
    *   Đảm bảo bạn đã tạo file `.env` trong thư mục `backend` và điền `API_KEY`.
    *   Nếu vẫn lỗi ở phía Client, người dùng có thể nhập key riêng của họ bằng cách bấm vào biểu tượng 🔑 trên thanh Header.

2.  **Lỗi không kết nối được Database:**
    *   Đảm bảo MongoDB đang chạy (`mongod`).
    *   Kiểm tra `MONGODB_URI` trong `.env`.

3.  **Lỗi "Load mãi không vào Dashboard":**
    *   Đảm bảo Backend đang chạy ở port 5000.
    *   F5 lại trang.

---

**Happy Learning & Coding! 🚀**
