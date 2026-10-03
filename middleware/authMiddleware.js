const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async(req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({ message: 'المستخدم غير موجود' });
            }

            return next(); // التأكد من إنهاء الميدلوير والانتقال
        } catch (error) {
            return res.status(401).json({ message: 'غير مصرح، التوكن غير صالحة' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'غير مصرح، لا يوجد توكن' });
    }
};

const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'صلاحية أدمن فقط للقيام بهذا الإجراء' });
    }
};

module.exports = { protect, adminOnly };