
import mongoose from 'mongoose';

const personalNoteSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // Explicit ID for frontend sync
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    content: { type: String, default: '' },
    tags: [{ type: String }],
    isPinned: { type: Boolean, default: false },
    linkedAssignmentId: { type: String },
    linkedPathId: { type: String },
    pdfFileId: { type: String },
    sharedWithSquadronId: { type: String },
    unlockedBy: [{ type: String }],
    comments: [{
        userId: String,
        userName: String,
        content: String,
        highlightedText: String,
        timestamp: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

export default mongoose.model('PersonalNote', personalNoteSchema);
