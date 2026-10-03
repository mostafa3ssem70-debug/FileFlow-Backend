const multer = require('multer');
const path = require('path');
const fs = require('fs');

// تحديد مسار المجلد بناءً على البيئة (مؤقت في Vercel ومحلي في جهازك)
const uploadDir = process.env.NODE_ENV === 'production' ?
    '/tmp/uploads' :
    path.join(__dirname, '../uploads');

// إنشاء المجلد إذا لم يكن موجوداً
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const upload = multer({
    storage,
    defParamCharset: 'utf8',
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

module.exports = upload;