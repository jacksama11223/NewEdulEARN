
import express from 'express';
import { loginUser, registerUser } from '../controllers/authController.js';
import { generateText, generateJson } from '../controllers/aiController.js';
import Course from '../models/Course.js';
import Lesson from '../models/Lesson.js';
import Assignment from '../models/Assignment.js';
import PersonalNote from '../models/PersonalNote.js';
import Task from '../models/Task.js';
import ChatMessage from '../models/ChatMessage.js'; 
import StudyGroup from '../models/StudyGroup.js';
import GroupMessage from '../models/GroupMessage.js';
import LearningPath from '../models/LearningPath.js';
import Quiz from '../models/Quiz.js';
import QuizSubmission from '../models/QuizSubmission.js';
import User from '../models/User.js';
import FlashcardDeck from '../models/FlashcardDeck.js'; // NEW IMPORT

const router = express.Router();

// --- AUTH ---
router.post('/auth/login', loginUser);
router.post('/auth/register', registerUser);

// --- HEARTBEAT & USERS (PRESENCE SYSTEM) ---
router.post('/users/heartbeat', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).json({ message: "UserId required" });

        const user = await User.findOneAndUpdate(
            { id: userId }, 
            { lastActiveAt: new Date() },
            { new: true }
        );

        if (!user) return res.status(404).json({ message: "User not found" });

        res.json({ 
            status: 'online', 
            serverTime: new Date(), 
            lastActive: user.lastActiveAt,
            token: "PRESENCE_ACK_ONLINE"
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/users', async (req, res) => {
    try {
        const users = await User.find({}).select('-password'); 
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.delete('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findOneAndDelete({ id });
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json({ message: "User deleted successfully", id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- AI ---
router.post('/ai/generate', generateText);
router.post('/ai/generate-json', generateJson);

// --- COURSES & LESSONS ---
router.get('/courses', async (req, res) => {
    try {
        const courses = await Course.find({});
        res.json(courses);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

router.post('/courses', async (req, res) => {
    try {
        const { id, ...updateData } = req.body;
        const course = await Course.findOneAndUpdate({ id }, { id, ...updateData }, { new: true, upsert: true });
        res.status(201).json(course);
    } catch (error) { res.status(400).json({ message: error.message }); }
});

router.get('/lessons', async (req, res) => {
    try {
        const lessons = await Lesson.find({});
        res.json(lessons);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

router.get('/lessons/:courseId', async (req, res) => {
    try {
        const lessons = await Lesson.find({ courseId: req.params.courseId });
        res.json(lessons);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

router.post('/lessons', async (req, res) => {
    try {
        const lesson = await Lesson.create(req.body);
        res.status(201).json(lesson);
    } catch (error) { res.status(400).json({ message: error.message }); }
});

// --- ASSIGNMENTS & QUIZZES ---
router.get('/assignments', async (req, res) => {
    try {
        const assignments = await Assignment.find({});
        res.json(assignments);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

router.post('/assignments', async (req, res) => {
    try {
        const assignment = await Assignment.create(req.body);
        res.status(201).json(assignment);
    } catch (error) { res.status(400).json({ message: error.message }); }
});

router.get('/quizzes', async (req, res) => {
    try {
        const quizzes = await Quiz.find({});
        res.json(quizzes);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

router.post('/quizzes', async (req, res) => {
    try {
        const { id, ...updateData } = req.body;
        const quiz = await Quiz.findOneAndUpdate({ id }, { id, ...updateData }, { new: true, upsert: true });
        res.status(201).json(quiz);
    } catch (error) { res.status(400).json({ message: error.message }); }
});

router.get('/quiz-submissions', async (req, res) => {
    try {
        const subs = await QuizSubmission.find({});
        res.json(subs);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

router.post('/quiz-submissions', async (req, res) => {
    try {
        const { quizId, studentId } = req.body;
        await QuizSubmission.deleteOne({ quizId, studentId });
        const sub = await QuizSubmission.create(req.body);
        res.status(201).json(sub);
    } catch (error) { res.status(400).json({ message: error.message }); }
});

// --- PERSONAL NOTES ---
router.get('/notes/:userId', async (req, res) => {
    try {
        const notes = await PersonalNote.find({ userId: req.params.userId });
        res.json(notes);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

router.post('/notes', async (req, res) => {
    try {
        const note = await PersonalNote.create(req.body);
        res.status(201).json(note);
    } catch (error) { res.status(400).json({ message: error.message }); }
});

router.put('/notes/:id', async (req, res) => {
    try {
        const note = await PersonalNote.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(note);
    } catch (error) { res.status(400).json({ message: error.message }); }
});

router.delete('/notes/:id', async (req, res) => {
    try {
        await PersonalNote.findByIdAndDelete(req.params.id);
        res.json({ message: "Deleted" });
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// --- TASKS ---
router.get('/tasks/:userId', async (req, res) => {
    try {
        const tasks = await Task.find({ userId: req.params.userId, isArchived: false });
        res.json(tasks);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

router.post('/tasks', async (req, res) => {
    try {
        const task = await Task.create(req.body);
        res.status(201).json(task);
    } catch (error) { res.status(400).json({ message: error.message }); }
});

router.put('/tasks/:id', async (req, res) => {
    try {
        const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(task);
    } catch (error) { res.status(400).json({ message: error.message }); }
});

// --- CHAT SYSTEM (1-1) ---
router.get('/chat/history/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const messages = await ChatMessage.find({
            $or: [{ from: userId }, { to: userId }]
        }).sort({ timestamp: 1 });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/chat/send', async (req, res) => {
    try {
        const newMessage = await ChatMessage.create(req.body);
        if (req.io) {
            req.io.to(newMessage.to).emit('receive_message', newMessage);
            req.io.to(newMessage.from).emit('receive_message', newMessage);
        }
        res.status(201).json(newMessage);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// --- GROUP SYSTEM ---
router.get('/groups', async (req, res) => {
    try {
        const groups = await StudyGroup.find({});
        res.json(groups);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

router.post('/groups', async (req, res) => {
    try {
        const group = await StudyGroup.create(req.body);
        res.status(201).json(group);
    } catch (error) { res.status(400).json({ message: error.message }); }
});

router.put('/groups/:id/join', async (req, res) => {
    try {
        const { userId } = req.body;
        const group = await StudyGroup.findOneAndUpdate(
            { id: req.params.id }, 
            { $addToSet: { members: userId } },
            { new: true }
        );
        res.json(group);
    } catch (error) { res.status(400).json({ message: error.message }); }
});

router.get('/group-chat/all', async (req, res) => {
    try {
        const messages = await GroupMessage.find({}).sort({ timestamp: 1 });
        res.json(messages);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

router.post('/group-chat/send', async (req, res) => {
    try {
        const message = await GroupMessage.create(req.body);
        if (req.io) {
            req.io.to(message.groupId).emit('receive_group_message', message);
        }
        res.status(201).json(message);
    } catch (error) { res.status(400).json({ message: error.message }); }
});

router.delete('/group-chat/:msgId', async (req, res) => {
    try {
        const message = await GroupMessage.findOneAndDelete({ id: req.params.msgId });
        if (!message) return res.status(404).json({ message: "Message not found" });
        if (req.io) {
            req.io.to(message.groupId).emit('group_message_deleted', { msgId: message.id, groupId: message.groupId });
        }
        res.json({ message: "Group message deleted successfully" });
    } catch (error) { res.status(500).json({ message: error.message }); }
});

router.put('/group-chat/:msgId/resolve', async (req, res) => {
    try {
        const { rescuerName } = req.body;
        const message = await GroupMessage.findOneAndUpdate(
            { id: req.params.msgId },
            { sosStatus: 'RESOLVED', rescuerName },
            { new: true }
        );
        if (req.io && message) {
            req.io.to(message.groupId).emit('receive_group_message_update', message);
        }
        res.json(message);
    } catch (error) { res.status(400).json({ message: error.message }); }
});

// --- LEARNING PATHS ---
router.get('/paths/:userId', async (req, res) => {
    try {
        const paths = await LearningPath.find({ creatorId: req.params.userId });
        res.json(paths);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

router.post('/paths', async (req, res) => {
    try {
        const path = await LearningPath.create(req.body);
        if (req.io) {
            req.io.to(req.body.creatorId).emit('receive_notification', {
                id: `notif_${Date.now()}`,
                text: `🔔 Bạn có lộ trình học tập mới: "${req.body.title}"`,
                type: 'assignment',
                timestamp: new Date()
            });
        }
        res.status(201).json(path);
    } catch (error) { res.status(400).json({ message: error.message }); }
});

router.put('/paths/:id', async (req, res) => {
    try {
        const path = await LearningPath.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
        res.json(path);
    } catch (error) { res.status(400).json({ message: error.message }); }
});

// --- FLASHCARD DECKS (NEW CRUD) ---
router.get('/decks/:userId', async (req, res) => {
    try {
        // Fetch decks created by user + standard course decks
        const decks = await FlashcardDeck.find({ userId: req.params.userId });
        res.json(decks);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

router.post('/decks', async (req, res) => {
    try {
        const deck = await FlashcardDeck.create(req.body);
        res.status(201).json(deck);
    } catch (error) { res.status(400).json({ message: error.message }); }
});

router.put('/decks/:id', async (req, res) => {
    try {
        const deck = await FlashcardDeck.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
        res.json(deck);
    } catch (error) { res.status(400).json({ message: error.message }); }
});

router.delete('/decks/:id', async (req, res) => {
    try {
        await FlashcardDeck.findOneAndDelete({ id: req.params.id });
        res.json({ message: "Deleted" });
    } catch (error) { res.status(500).json({ message: error.message }); }
});

// --- SRS REVIEW SYSTEM (ANKI-STYLE / DUOLINGO-STYLE) ---

// Get all cards due for review from BOTH Decks and Learning Paths
router.get('/reviews/due/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const now = Date.now();
        const dueCards = [];

        // 1. Fetch from standalone Decks
        const decks = await FlashcardDeck.find({ userId });
        decks.forEach(deck => {
            deck.cards.forEach(card => {
                // Determine if card is due (nextReview <= now)
                // New cards have nextReview = 0, so they are always due.
                if (card.nextReview <= now) {
                    dueCards.push({
                        ...card.toObject(),
                        sourceType: 'deck',
                        sourceId: deck.id,
                        deckTitle: deck.title
                    });
                }
            });
        });

        // 2. Fetch from Learning Paths (Deep Search)
        const paths = await LearningPath.find({ creatorId: userId });
        paths.forEach(path => {
            path.nodes.forEach(node => {
                if (node.flashcards && node.flashcards.length > 0) {
                    node.flashcards.forEach(card => {
                        if (card.nextReview <= now) {
                            dueCards.push({
                                ...card.toObject(),
                                sourceType: 'path',
                                sourceId: path.id, // pathId
                                nodeId: node.id,
                                deckTitle: `${path.title} - ${node.title}`
                            });
                        }
                    });
                }
            });
        });
        
        // Sort: Overdue items first
        dueCards.sort((a, b) => a.nextReview - b.nextReview);

        res.json(dueCards);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Record review result (Exponential Backoff Algorithm)
router.post('/reviews/record', async (req, res) => {
    try {
        const { cardId, rating, sourceType, sourceId, nodeId } = req.body;
        // rating: 'easy', 'medium', 'hard'
        
        const now = Date.now();
        const ONE_MINUTE = 60 * 1000;
        const ONE_HOUR = 60 * ONE_MINUTE;
        const ONE_DAY = 24 * ONE_HOUR;
        
        let doc;
        let cardList;
        
        // Fetch Source
        if (sourceType === 'deck') {
            doc = await FlashcardDeck.findOne({ id: sourceId });
            cardList = doc.cards;
        } else {
            doc = await LearningPath.findOne({ id: sourceId });
            const node = doc.nodes.find(n => n.id === nodeId);
            if (node) cardList = node.flashcards;
        }

        if (!doc || !cardList) return res.status(404).json({ message: "Source not found" });

        const cardIndex = cardList.findIndex(c => c.id === cardId);
        if (cardIndex === -1) return res.status(404).json({ message: "Card not found" });

        const card = cardList[cardIndex];
        let newBox = card.box || 0; // Box essentially represents 'streak' or 'ease tier'
        let interval = 0;

        // --- EXPONENTIAL BACKOFF LOGIC (ANKI STYLE) ---
        if (rating === 'hard') {
            // FORGOT: Reset to beginning.
            newBox = 0; 
            interval = 10 * ONE_MINUTE; // Review again in 10 mins (Learning step)
        } else if (rating === 'medium') {
            // STRUGGLED: Keep current level, small boost.
            // If new, 1 day. If mature, 1.5x current interval (estimated).
            // Simplified: box stays same, interval is conservative.
            newBox = Math.max(0, newBox);
            // Estimate previous interval based on box
            // If box 0 -> 1 day. Box 1 -> 2 days.
            const prevIntervalEstimate = (newBox === 0 ? 1 : Math.pow(2.2, newBox)) * ONE_DAY;
            interval = Math.max(ONE_DAY, prevIntervalEstimate * 1.2); 
        } else { // 'easy'
            // MASTERED: Graduated increment.
            // Box 0 -> 1 day
            // Box 1 -> 3 days
            // Box 2 -> 7 days
            // Box 3 -> 16 days
            // Box 4 -> 35 days
            // Box 5 -> 80 days (~3 months)
            // Box 6 -> 180 days (~6 months)
            // Box 7 -> 365 days (1 year)
            
            newBox = newBox + 1;
            
            if (newBox === 1) interval = 1 * ONE_DAY;
            else if (newBox === 2) interval = 3 * ONE_DAY;
            else if (newBox === 3) interval = 7 * ONE_DAY;
            else if (newBox === 4) interval = 16 * ONE_DAY;
            else if (newBox === 5) interval = 35 * ONE_DAY;
            else if (newBox === 6) interval = 80 * ONE_DAY;
            else if (newBox === 7) interval = 180 * ONE_DAY;
            else interval = 365 * ONE_DAY * (Math.pow(1.1, newBox - 7)); // Year+ with slow growth
        }

        const nextReview = now + interval;

        // Update In-Memory
        card.box = newBox;
        card.nextReview = nextReview;
        card.lastReviewed = now;

        // Mongoose specifics
        if (sourceType === 'path') {
            doc.markModified('nodes');
        } else {
            doc.markModified('cards');
        }

        await doc.save();

        res.json({ message: "Review recorded", nextReview, box: newBox, intervalMs: interval });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
});

export default router;
