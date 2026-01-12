
import { DB } from '../data/mockDb.js';

export const loginUser = (req, res) => {
    const { userId, password } = req.body;
    const user = DB.USERS[userId];

    if (user && user.password === password) {
        if (user.isLocked) {
            return res.status(403).json({ message: "Tài khoản bị khóa." });
        }
        // Trong thực tế, bạn sẽ trả về JWT Token ở đây
        const { password, ...userWithoutPass } = user;
        return res.json(userWithoutPass);
    }
    return res.status(401).json({ message: "Sai tên đăng nhập hoặc mật khẩu" });
};

export const getCourses = (req, res) => {
    res.json(DB.COURSES);
};

export const getUserProfile = (req, res) => {
    const { userId } = req.params;
    const user = DB.USERS[userId];
    if (user) {
        const { password, ...u } = user;
        res.json(u);
    } else {
        res.status(404).json({ message: "User not found" });
    }
};
