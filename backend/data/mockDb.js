
// Đây là bản sao của mockData.ts nhưng ở phía Server.
// Trong thực tế, bạn sẽ thay thế file này bằng kết nối MongoDB hoặc PostgreSQL.

export const DB = {
    USERS: {
        "sv001": { id: "sv001", password: "1", name: "Hoàng Đăng Quang", role: "STUDENT", isLocked: false },
        "gv001": { id: "gv001", password: "1", name: "Nguyễn Đăng Bắc", role: "TEACHER", isLocked: false },
        "qt001": { id: "qt001", password: "1", name: "Admin User", role: "ADMIN", isLocked: false }
    },
    COURSES: [
        { id: "CS101", name: "Nhập môn Trí tuệ Nhân tạo", teacher: "Nguyễn Trùng Lập" }
    ],
    // ... Copy thêm data từ mockData.ts nếu cần persistence tạm thời trên RAM server
    LESSONS: {},
    ASSIGNMENTS: {}
};
