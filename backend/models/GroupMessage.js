
import mongoose from 'mongoose';

const groupMessageSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    groupId: { type: String, required: true, index: true },
    user: {
        id: String,
        name: String,
        role: String
    },
    text: { type: String, required: true },
    isSOS: { type: Boolean, default: false },
    sosStatus: { type: String }, // 'PENDING' | 'RESOLVED'
    rescuerName: { type: String },
    isWhisper: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('GroupMessage', groupMessageSchema);
