
import mongoose from 'mongoose';

const quizSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    title: { type: String },
    questions: [{
        id: String,
        text: String,
        options: [String],
        correctAnswer: Number,
        explanation: String
    }]
}, { timestamps: true });

export default mongoose.model('Quiz', quizSchema);
