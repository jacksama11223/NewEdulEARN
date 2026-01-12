
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // Custom ID like 'sv001'
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['STUDENT', 'TEACHER', 'ADMIN'], default: 'STUDENT' },
    isLocked: { type: Boolean, default: false },
    squadronId: { type: String, default: null },
    hasSeenOnboarding: { type: Boolean, default: false },
    gamification: {
        points: { type: Number, default: 0 },
        diamonds: { type: Number, default: 0 },
        inventory: [{ type: String }],
        equippedSkin: { type: String, default: 'skin_default' }
    }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
