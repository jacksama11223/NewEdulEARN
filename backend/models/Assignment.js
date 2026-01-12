import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    courseId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    type: { type: String, enum: ['file', 'quiz'], default: 'file' },
    quizId: { type: String },
    description: { type: String },
    rank: { type: String, enum: ['S', 'A', 'B'], default: 'B' },
    isBoss: { type: Boolean, default: false },
    rewardXP: { type: Number, default: 100 }
}, { timestamps: true });

export default mongoose.model('Assignment', assignmentSchema);