
import mongoose from 'mongoose';

const quizSubmissionSchema = new mongoose.Schema({
    quizId: { type: String, required: true, index: true },
    studentId: { type: String, required: true, index: true },
    score: Number,
    total: Number,
    percentage: Number,
    answers: { type: Map, of: Number }, // Lưu key-value: questionId -> selectedIndex
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('QuizSubmission', quizSubmissionSchema);
