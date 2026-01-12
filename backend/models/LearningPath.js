
import mongoose from 'mongoose';

const learningPathSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // ID dạng 'lp_...' từ frontend
    creatorId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    topic: { type: String },
    targetLevel: { type: String },
    goal: { type: String },
    dailyCommitment: { type: String },
    suggestedSkinId: { type: String },
    nodes: [{
        id: String,
        title: String,
        description: String,
        // CHANGED: Removed strict enum to prevent validation errors when AI invents new types. Defaults to 'theory'.
        type: { type: String, default: 'theory' }, 
        isLocked: { type: Boolean, default: true },
        isCompleted: { type: Boolean, default: false },
        flashcardsMastered: { type: Number, default: 0 },
        isExamUnlocked: { type: Boolean, default: false },
        examScore: Number,
        // Lưu trữ flashcards và câu hỏi exam đã generate để không mất tiền AI generate lại
        flashcards: [{
            id: String,
            front: String,
            back: String,
            box: Number,
            nextReview: Number
        }],
        examQuestions: Array 
    }],
    wager: {
        amount: Number,
        deadline: Date,
        isResolved: { type: Boolean, default: false }
    }
}, { timestamps: true });

export default mongoose.model('LearningPath', learningPathSchema);
