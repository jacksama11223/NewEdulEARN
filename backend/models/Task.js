import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    text: { type: String, required: true },
    isCompleted: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    completedAt: { type: Date }
}, { timestamps: true });

export default mongoose.model('Task', taskSchema);