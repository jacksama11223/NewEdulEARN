import express from 'express';
import { loginUser, registerUser } from '../controllers/authController.js';
import { generateText, generateJson } from '../controllers/aiController.js';
import Course from '../models/Course.js';
import Lesson from '../models/Lesson.js';
import Assignment from '../models/Assignment.js';
import PersonalNote from '../models/PersonalNote.js';
import Task from '../models/Task.js';

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

router.get('/lessons/:courseId', async (req, res) => {
    try {
        const lessons = await Lesson.find({ courseId: req.params.courseId });
        res.json(lessons);
    } catch (error) { res.status(500).json({ message: error.message }); }
});

router.get('/assignments/:courseId', async (req, res) => {
    try {
        const assignments = await Assignment.find({ courseId: req.params.courseId });
        res.json(assignments);
    } catch (error) { res.status(500).json({ message: error.message }); }
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

export default router;