
import mongoose from 'mongoose';

const studyGroupSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    members: [{ type: String }], // Array of User IDs
    mission: {
        id: String,
        title: String,
        target: Number,
        current: Number,
        reward: Number,
        type: String
    }
}, { timestamps: true });

export default mongoose.model('StudyGroup', studyGroupSchema);
