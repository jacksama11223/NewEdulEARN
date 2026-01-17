import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true }, // Recipient ID
    text: { type: String, required: true },
    type: { type: String, default: 'info' }, // 'intervention', 'system', 'assignment'
    read: { type: Boolean, default: false },
    metadata: { type: mongoose.Schema.Types.Mixed }, // Store assignmentId, questionId, teacherNote
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);
