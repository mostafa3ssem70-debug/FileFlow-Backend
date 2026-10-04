const express = require('express');
const router = express.Router();
const {
    uploadFile,
    updateFile,
    getFiles,
    getDownloadStats,
    downloadFile,
    deleteFile,
    viewFile, // <-- إضافة الدالة هنا
} = require('../controllers/fileController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.post('/upload', protect, upload.single('file'), uploadFile);
router.get('/', protect, getFiles);
router.get('/download-stats', protect, adminOnly, getDownloadStats);
router.put('/:id', protect, adminOnly, updateFile);
router.get('/view/:id', protect, viewFile);
router.get('/download/:id', protect, downloadFile);
router.delete('/:id', protect, adminOnly, deleteFile);

module.exports = router;