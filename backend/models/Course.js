
import mongoose from 'mongoose';

const courseSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true }, // e.g., 'CS101'
    name: { type: String, required: true },
    teacher: { type: String, required: true }, // Teacher Name
    description: { type: String },
    modules: [{
        id: String,
        name: String,
        items: [{
            type: { type: String, enum: ['lesson', 'assignment'] },
            id: String // Reference ID to Lesson or Assignment collection
        }]
    }]
}, { timestamps: true });

export default mongoose.model('Course', courseSchema);
