
import mongoose from 'mongoose';

const fileSubmissionSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    assignmentId: { type: String, required: true, index: true },
    studentId: { type: String, required: true, index: true },
    studentName: { type: String },
    status: { type: String, default: 'Đã nộp' },
    grade: { type: Number, default: null },
    feedback: { type: String, default: null },
    fileName: { type: String },
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('FileSubmission', fileSubmissionSchema);
