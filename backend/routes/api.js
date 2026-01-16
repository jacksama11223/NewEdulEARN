
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

// ... (Keep existing routes until SRS section) ...

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
        
        // Notify all users about the new/updated course
        if (req.io) {
            req.io.emit('db_update', { type: 'COURSE', data: course });
        }
        
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
        if (req.io) {
            req.io.emit('db_update', { type: 'LESSON', data: lesson });
        }
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
        if (req.io) {
            req.io.emit('db_update', { type: 'ASSIGNMENT', data: assignment });
        }
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
        if (req.io) {
            req.io.emit('db_update', { type: 'QUIZ', data: quiz });
        }
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
        // Only notify the teacher and the student (optimized), but for now broadcast to keep simple
        if (req.io) {
            req.io.emit('db_update', { type: 'QUIZ_SUBMISSION', data: sub });
        }
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
        // FIXED: Use findOneAndUpdate with the custom 'id' field instead of findByIdAndUpdate (which uses _id)
        const note = await PersonalNote.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
        if (!note) {
            return res.status(404).json({ message: "Note not found" });
        }
        res.json(note);
    } catch (error) { res.status(400).json({ message: error.message }); }
});

router.delete('/notes/:id', async (req, res) => {
    try {
        // FIXED: Use findOneAndDelete with the custom 'id' field
        const note = await PersonalNote.findOneAndDelete({ id: req.params.id });
        if (!note) {
            return res.status(404).json({ message: "Note not found" });
        }
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
        // Assuming Task might use _id if not specified otherwise, but for consistency if using custom id:
        // const task = await Task.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
        // Keeping original logic if Tasks don't have custom string ID in schema, otherwise update:
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
        if (req.io) {
            req.io.emit('db_update', { type: 'GROUP', data: group });
        }
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
        
        // FIX: Notify all users about group update (member list change)
        if (req.io) {
            req.io.emit('db_update', { type: 'GROUP', data: group });
        }

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

// FIX: New Endpoint to Assign Paths to Multiple Students
router.post('/paths/assign', async (req, res) => {
    try {
        const { teacherName, studentIds, pathData } = req.body;
        const createdPaths = [];

        for (const studentId of studentIds) {
            const newPathData = {
                ...pathData,
                id: `lp_assign_${Date.now()}_${studentId}`, // Unique ID per student
                creatorId: studentId, // Student becomes the owner to track their progress
                createdAt: new Date()
            };
            
            const newPath = await LearningPath.create(newPathData);
            createdPaths.push(newPath);

            // Notify Student
            if (req.io) {
                // 1. Send Notification
                req.io.to(studentId).emit('receive_notification', {
                    id: `notif_assign_${Date.now()}`,
                    text: `👨‍🏫 Giáo viên ${teacherName} đã giao cho bạn lộ trình: "${newPathData.title}"`,
                    type: 'assignment',
                    timestamp: new Date()
                });
                
                // 2. Push Update directly so it appears in list without refresh
                req.io.to(studentId).emit('learning_path_assigned', newPath);
            }
        }

        res.status(201).json({ message: `Assigned to ${createdPaths.length} students`, paths: createdPaths });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.put('/paths/:id', async (req, res) => {
    try {
        const path = await LearningPath.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
        res.json(path);
    } catch (error) { res.status(400).json({ message: error.message }); }
});

// --- FLASHCARD DECKS ---
router.get('/decks/:userId', async (req, res) => {
    try {
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

// --- SRS REVIEW SYSTEM ---

// Get OVERDUE cards (for Smart Widget)
router.get('/reviews/due/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const now = Date.now();
        const dueCards = [];

        // 1. Fetch from standalone Decks
        const decks = await FlashcardDeck.find({ userId });
        decks.forEach(deck => {
            deck.cards.forEach(card => {
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

        // 2. Fetch from Learning Paths
        const paths = await LearningPath.find({ creatorId: userId });
        paths.forEach(path => {
            path.nodes.forEach(node => {
                if (node.flashcards && node.flashcards.length > 0) {
                    node.flashcards.forEach(card => {
                        if (card.nextReview <= now) {
                            dueCards.push({
                                ...card.toObject(),
                                sourceType: 'path',
                                sourceId: path.id, 
                                nodeId: node.id,
                                deckTitle: `${path.title} - ${node.title}`
                            });
                        }
                    });
                }
            });
        });
        
        dueCards.sort((a, b) => a.nextReview - b.nextReview);

        res.json(dueCards);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// NEW: Get UPCOMING reviews (Paged)
router.get('/reviews/upcoming/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        let allCards = [];

        // 1. From Decks
        const decks = await FlashcardDeck.find({ userId });
        decks.forEach(deck => {
            deck.cards.forEach(card => {
                allCards.push({
                    ...card.toObject(),
                    deckTitle: deck.title,
                    sourceId: deck.id,
                    type: 'Deck'
                });
            });
        });

        // 2. From Paths
        const paths = await LearningPath.find({ creatorId: userId });
        paths.forEach(path => {
            path.nodes.forEach(node => {
                if (node.flashcards) {
                    node.flashcards.forEach(card => {
                        allCards.push({
                            ...card.toObject(),
                            deckTitle: `${path.title} - ${node.title}`,
                            sourceId: path.id,
                            type: 'Path'
                        });
                    });
                }
            });
        });

        // Sort by nextReview (Nearest first)
        allCards.sort((a, b) => a.nextReview - b.nextReview);

        const total = allCards.length;
        const paginatedCards = allCards.slice(skip, skip + limit);

        res.json({
            cards: paginatedCards,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Record review result (OPTIMIZED SRS ALGORITHM)
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
        let newBox = card.box || 0; 
        let interval = 0;

        // --- OPTIMIZED ANKI-STYLE ALGORITHM ---
        
        if (rating === 'hard') {
            newBox = 0; 
            interval = 1 * ONE_MINUTE; // Reset: 1 min
        } else if (rating === 'medium') {
            // Struggle but correct: Keep box or slightly reduce, short interval
            newBox = Math.max(0, newBox - 1);
            interval = 10 * ONE_MINUTE; // 10 mins
        } else { 
            // Easy
            newBox = newBox + 1;
            
            // Learning Steps (Short term)
            if (newBox === 1) interval = 10 * ONE_MINUTE;      // Step 1: 10 mins
            else if (newBox === 2) interval = 1 * ONE_HOUR;    // Step 2: 1 hour
            else if (newBox === 3) interval = 5 * ONE_HOUR;    // Step 3: 5 hours
            
            // Graduated Steps (Long term)
            else if (newBox === 4) interval = 1 * ONE_DAY;     // Graduated: 1 day
            else if (newBox === 5) interval = 3 * ONE_DAY;     // 3 days
            else if (newBox === 6) interval = 7 * ONE_DAY;     // 1 week
            else {
                // Exponential Growth for long term
                const days = 7 * Math.pow(2, newBox - 6);
                interval = days * ONE_DAY;
            }
        }

        const nextReview = now + interval;

        card.box = newBox;
        card.nextReview = nextReview;
        card.lastReviewed = now;

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
