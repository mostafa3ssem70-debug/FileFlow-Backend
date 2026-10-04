const File = require('../models/File');
const User = require('../models/User');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const canAccessFile = (file, user) => {
    if (user.role === 'admin') return true;
    if (file.department !== user.department) return false;
    if (file.accessMode !== 'users') return true;
    return (file.sharedWith || []).some((userId) => String(userId) === String(user._id));
};

const rejectUpload = (req, res, status, message) => {
    if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
    }
    return res.status(status).json({ message });
};

// @desc    Upload new file
// @route   POST /api/files/upload
exports.uploadFile = async(req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'يرجى اختيار ملف لرفعه' });
        }

        const department = req.body.department || req.user.department || 'General';
        if (req.user.role !== 'admin' && department !== req.user.department) {
            return rejectUpload(req, res, 403, 'لا يمكنك رفع ملف إلى قسم آخر');
        }

        const accessMode = req.body.accessMode || 'department';
        if (!['department', 'users'].includes(accessMode)) {
            return rejectUpload(req, res, 400, 'نطاق مشاركة غير صالح');
        }

        let sharedWith = [];
        if (accessMode === 'users') {
            let requestedUserIds;
            try {
                requestedUserIds = JSON.parse(req.body.sharedWith || '[]');
            } catch {
                return rejectUpload(req, res, 400, 'قائمة الحسابات المحددة غير صالحة');
            }

            if (!Array.isArray(requestedUserIds) || requestedUserIds.length === 0) {
                return rejectUpload(req, res, 400, 'اختر حساباً واحداً على الأقل لعرض الملف');
            }

            const uniqueUserIds = [...new Set(requestedUserIds.map(String))];
            if (uniqueUserIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
                return rejectUpload(req, res, 400, 'أحد الحسابات المحددة غير صالح');
            }

            const matchedUsers = await User.find({
                _id: { $in: uniqueUserIds },
                department,
                role: 'employee',
            }).select('_id');

            if (matchedUsers.length !== uniqueUserIds.length) {
                return rejectUpload(req, res, 400, 'يجب اختيار حسابات موظفين من القسم المحدد فقط');
            }

            sharedWith = uniqueUserIds;
            if (req.user.role !== 'admin' && !sharedWith.includes(String(req.user._id))) {
                sharedWith.push(String(req.user._id));
            }
        }

        const file = await File.create({
            originalName: req.file.originalname,
            fileName: req.file.filename,
            filePath: req.file.path,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            uploadedBy: req.user._id,
            department,
            accessMode,
            sharedWith,
        });

        res.status(201).json(file);
    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all files
// @route   GET /api/files
exports.getFiles = async(req, res) => {
    try {
        const query = req.user.role === 'admin' ? {} : {
            department: req.user.department,
            $or: [
                { accessMode: { $ne: 'users' } },
                { sharedWith: req.user._id },
            ],
        };

        const files = await File.find(query)
            .populate('uploadedBy', 'name username')
            .sort({ createdAt: -1 });

        res.json(files);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Download file
// @route   GET /api/files/download/:id
exports.downloadFile = async(req, res) => {
    try {
        const file = await File.findById(req.params.id);

        if (!file) {
            return res.status(404).json({ message: 'الملف غير موجود' });
        }
        if (!canAccessFile(file, req.user)) {
            return res.status(404).json({ message: 'الملف غير موجود' });
        }

        const filePath = path.resolve(file.filePath);
        res.download(filePath, file.originalName);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete file (Admin Only)
// @route   DELETE /api/files/:id
exports.deleteFile = async(req, res) => {
    try {
        const file = await File.findById(req.params.id);

        if (!file) {
            return res.status(404).json({ message: 'الملف غير موجود' });
        }

        if (fs.existsSync(file.filePath)) {
            fs.unlinkSync(file.filePath);
        }

        await file.deleteOne();
        res.json({ message: 'تم حذف الملف بنجاح' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// دالة عرض الملف داخل المتصفح (Inline Preview)
exports.viewFile = async(req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) {
            return res.status(404).json({ message: 'الملف غير موجود' });
        }
        if (!canAccessFile(file, req.user)) {
            return res.status(404).json({ message: 'الملف غير موجود' });
        }

        const absolutePath = path.resolve(file.filePath);
        const safeFileName = String(file.originalName || 'file').replace(/["\\\r\n]/g, '_');
        const asciiFileName = safeFileName.replace(/[^\x20-\x7E]/g, '_');
        const encodedFileName = encodeURIComponent(safeFileName).replace(/['()*]/g, (character) => (
            `%${character.charCodeAt(0).toString(16).toUpperCase()}`
        ));
        const extension = path.extname(safeFileName).toLowerCase();
        const mimeMap = {
            '.pdf': 'application/pdf',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
            '.txt': 'text/plain; charset=utf-8',
            '.csv': 'text/csv; charset=utf-8',
            '.html': 'text/html; charset=utf-8',
            '.json': 'application/json; charset=utf-8',
        };

        const contentType = file.mimeType && file.mimeType !== 'application/octet-stream' ?
            file.mimeType :
            mimeMap[extension] || 'application/octet-stream';

        res.setHeader('Content-Type', contentType);
        res.setHeader(
            'Content-Disposition',
            `inline; filename="${asciiFileName}"; filename*=UTF-8''${encodedFileName}`,
        );
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

        res.sendFile(absolutePath);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};