import mongoose from 'mongoose';

const lessonSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    courseId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    type: { type: String, enum: ['video', 'text'], default: 'text' },
    content: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('Lesson', lessonSchema);