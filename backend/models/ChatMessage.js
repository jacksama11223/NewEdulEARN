
import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // Client generated ID (e.g. msg_123)
    from: { type: String, required: true }, // User ID gửi
    to: { type: String, required: true },   // User ID nhận
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    
    // Các trường đặc biệt (Mixed để linh hoạt lưu JSON object)
    challenge: { type: mongoose.Schema.Types.Mixed },
    intel: { type: mongoose.Schema.Types.Mixed },
    trade: { type: mongoose.Schema.Types.Mixed },
    gradeDispute: { type: mongoose.Schema.Types.Mixed },
    reward: { type: mongoose.Schema.Types.Mixed },
    squadronInvite: { type: mongoose.Schema.Types.Mixed }
});

// Index để tìm kiếm nhanh lịch sử chat giữa 2 người
chatMessageSchema.index({ from: 1, to: 1 });
chatMessageSchema.index({ timestamp: 1 });

export default mongoose.model('ChatMessage', chatMessageSchema);
