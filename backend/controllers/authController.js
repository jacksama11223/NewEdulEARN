
import User from '../models/User.js';

// @desc    Auth user & get token
// @route   POST /api/auth/login
export const loginUser = async (req, res) => {
    const { userId, password } = req.body;

    try {
        const user = await User.findOne({ id: userId });

        if (user && (user.password === password)) { // Note: In production, use bcrypt for password hashing
            if (user.isLocked) {
                return res.status(403).json({ message: "Tài khoản đã bị khóa." });
            }
            
            res.json({
                id: user.id,
                name: user.name,
                role: user.role,
                isLocked: user.isLocked,
                hasSeenOnboarding: user.hasSeenOnboarding,
                gamification: user.gamification
            });
        } else {
            res.status(401).json({ message: "Sai tên đăng nhập hoặc mật khẩu" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Register a new user
// @route   POST /api/auth/register
export const registerUser = async (req, res) => {
    const { id, password, name, role } = req.body;

    try {
        const userExists = await User.findOne({ id });

        if (userExists) {
            return res.status(400).json({ message: "User ID đã tồn tại" });
        }

        const user = await User.create({
            id,
            password, // Note: Hash this in production
            name,
            role,
            gamification: { points: 0, diamonds: 0, inventory: ['skin_default'] }
        });

        if (user) {
            res.status(201).json({
                id: user.id,
                name: user.name,
                role: user.role
            });
        } else {
            res.status(400).json({ message: "Dữ liệu không hợp lệ" });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
