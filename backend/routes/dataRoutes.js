
import express from 'express';
import { loginUser, getCourses, getUserProfile } from '../controllers/dataController.js';

const router = express.Router();

// Auth
router.post('/login', loginUser);

// Courses
router.get('/courses', getCourses);

// Users
router.get('/users/:userId', getUserProfile);

export default router;
