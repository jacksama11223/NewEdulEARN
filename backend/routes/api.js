
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
import Quiz from '../models/Quiz.js'; // NEW
import QuizSubmission from '../models/QuizSubmission.js'; // NEW

const router = express.Router();

// --- AUTH ---
router.post('/auth/login', loginUser);
router.post('/auth/register', registerUser);

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
        // Upsert course based on ID
        const course = await Course.findOneAndUpdate({ id }, { id, ...updateData }, { new: true, upsert: true });
        res.status(201).json(course);
    } catch (error) { res.status(400).json({ message: error.message }); }
});

router.get('/lessons', async (req, res) => {
    try {
        // Fetch all lessons (optimized for this demo structure)
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

// --- ASSIGNMENTS & QUIZZES (UPDATED) ---
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
        // Upsert: Create if not exists, update if exists
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
        // Replace previous submission if exists for this student+quiz
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
        res.status(201).json(message);
    } catch (error) { res.status(400).json({ message: error.message }); }
});

router.put('/group-chat/:msgId/resolve', async (req, res) => {
    try {
        const { rescuerName } = req.body;
        const message = await GroupMessage.findOneAndUpdate(
            { id: req.params.msgId },
            { sosStatus: 'RESOLVED', rescuerName },
            { new: true }
        );
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
        res.status(201).json(path);
    } catch (error) { res.status(400).json({ message: error.message }); }
});

router.put('/paths/:id', async (req, res) => {
    try {
        const path = await LearningPath.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
        res.json(path);
    } catch (error) { res.status(400).json({ message: error.message }); }
});

export default router;
