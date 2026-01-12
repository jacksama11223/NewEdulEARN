
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Course from './models/Course.js';

dotenv.config();

const users = [
    { id: "sv001", password: "1", name: "Hoàng Đăng Quang", role: "STUDENT" },
    { id: "gv001", password: "1", name: "Nguyễn Đăng Bắc", role: "TEACHER" },
    { id: "qt001", password: "1", name: "Admin User", role: "ADMIN" }
];

const courses = [
    { id: "CS101", name: "Nhập môn Trí tuệ Nhân tạo", teacher: "Nguyễn Trùng Lập", modules: [] },
    { id: "CS202", name: "Kiến trúc Phần mềm", teacher: "Nguyễn Đăng Bắc", modules: [] }
];

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('🔌 Connected to MongoDB');

        // Clear existing data
        await User.deleteMany();
        await Course.deleteMany();

        // Insert new data
        await User.insertMany(users);
        await Course.insertMany(courses);

        console.log('✅ Data Seeded Successfully');
        process.exit();
    } catch (error) {
        console.error('❌ Error seeding data:', error);
        process.exit(1);
    }
};

seedData();
