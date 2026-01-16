
import mongoose from 'mongoose';

const flashcardSchema = new mongoose.Schema({
    id: String,
    front: String,
    back: String,
    box: { type: Number, default: 0 },
    nextReview: { type: Number, default: 0 },
    lastReviewed: Number
}, { _id: false });

const flashcardDeckSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true }, // Owner of the deck
    courseId: String, // Optional: linked to a course
    moduleId: String, // Optional: linked to a module
    title: { type: String, required: true },
    cards: [flashcardSchema]
}, { timestamps: true });

export default mongoose.model('FlashcardDeck', flashcardDeckSchema);
