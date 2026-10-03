const User = require('../models/User');
const jwt = require('jsonwebtoken');

// دالة تصفير وإنشاء الـ JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Login User & Get Token
// @route   POST /api/auth/login
exports.loginUser = async(req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });

        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                name: user.name,
                username: user.username,
                role: user.role,
                department: user.department,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'بيانات الدخول غير صحيحة' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Register new Employee (Admin Only)
// @route   POST /api/auth/register
exports.registerUser = async(req, res) => {
    const { name, username, password, role, department } = req.body;

    try {
        const userExists = await User.findOne({ username });

        if (userExists) {
            return res.status(400).json({ message: 'اسم المستخدم موجود بالفعل' });
        }

        const user = await User.create({
            name,
            username,
            password,
            role: role || 'employee',
            department: department || 'General',
            createdBy: req.user && req.user._id ? req.user._id : null,
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                name: user.name,
                username: user.username,
                role: user.role,
                department: user.department,
                createdBy: user.createdBy,
            });
        } else {
            res.status(400).json({ message: 'بيانات غير صحيحة' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get users created by the current admin
// @route   GET /api/auth/users
exports.getUsersByAdmin = async(req, res) => {
    try {
        // جلب كافة الحسابات واستبعاد كلمة السر، وترتيبها من الأحدث للأقدم
        const users = await User.find()
            .select('-password')
            .populate('createdBy', 'name username') // لإظهار اسم الأدمن الذي أنشأ الحساب
            .sort({ createdAt: -1 });

        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @route   GET /api/auth/department-users?department=Engineering
exports.getUsersByDepartment = async(req, res) => {
    try {
        const department = String(req.query.department || '');
        if (!department) {
            return res.status(400).json({ message: 'يجب تحديد القسم' });
        }

        if (req.user.role !== 'admin' && req.user.department !== department) {
            return res.status(403).json({ message: 'لا يمكنك عرض حسابات قسم آخر' });
        }

        const users = await User.find({ department, role: 'employee' })
            .select('_id name username department')
            .sort({ name: 1 });

        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update user (Admin Only)
// @route   PUT /api/auth/users/:id
exports.updateUser = async(req, res) => {
    try {
        const { name, username, password, department, role } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'الحساب غير موجود' });
        }

        // التحقق من أن اسم المستخدم الجديد غير مستخدم من قبل حساب آخر
        if (username && username !== user.username) {
            const usernameExists = await User.findOne({ username });
            if (usernameExists && String(usernameExists._id) !== String(user._id)) {
                return res.status(400).json({ message: 'اسم المستخدم موجود بالفعل' });
            }
        }

        // تحديث البيانات الإضافية إذا تم إرسالها
        if (name) user.name = name;
        if (username) user.username = username;
        if (department) user.department = department;
        if (role) user.role = role;

        // عند إرسال كلمة سر جديدة سيتم تشفيرها تلقائياً بفضل الـ pre-save hook في السكيما
        if (password) user.password = password;

        await user.save();

        res.json({
            _id: user._id,
            name: user.name,
            username: user.username,
            role: user.role,
            department: user.department,
            createdBy: user.createdBy,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete user (Admin Only)
// @route   DELETE /api/auth/users/:id
exports.deleteUser = async(req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'الحساب غير موجود' });
        }

        // حماية لمنع الأدمن من حذف حسابه الحالي المسجل به
        if (String(user._id) === String(req.user._id)) {
            return res.status(400).json({ message: 'لا يمكنك حذف حسابك الحالي' });
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'تم حذف الحساب بنجاح' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};