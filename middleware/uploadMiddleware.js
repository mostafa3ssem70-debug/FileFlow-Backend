const multer = require('multer');
const path = require('path');
const fs = require('fs');

let storage;
if (process.env.NODE_ENV === 'production') {
    storage = multer.memoryStorage();
} else {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            cb(null, `${Date.now()}-${file.originalname}`);
        },
    });
}

const upload = multer({
    storage,
    defParamCharset: 'utf8',
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

module.exports = upload;