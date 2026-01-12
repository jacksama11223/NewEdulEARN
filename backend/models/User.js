
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // Custom ID like 'sv001'
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['STUDENT', 'TEACHER', 'ADMIN'], default: 'STUDENT' },
    isLocked: { type: Boolean, default: false },
    squadronId: { type: String, default: null },
    hasSeenOnboarding: { type: Boolean, default: false },
    lastActiveAt: { type: Date, default: Date.now }, // NEW: Track last activity
    gamification: {
        points: { type: Number, default: 0 },
        diamonds: { type: Number, default: 0 },
        inventory: [{ type: String }],
        equippedSkin: { type: String, default: 'skin_default' }
    }
}, { 
    timestamps: true,
    toJSON: { virtuals: true }, // Ensure virtuals are included in JSON response
    toObject: { virtuals: true }
});

// Virtual property to check if user is online (active within last 2 minutes)
userSchema.virtual('isOnline').get(function() {
    if (!this.lastActiveAt) return false;
    const threshold = 2 * 60 * 1000; // 2 minutes
    return (new Date() - this.lastActiveAt) < threshold;
});

export default mongoose.model('User', userSchema);
