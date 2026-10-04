const mongoose = require('mongoose');

const downloadLogSchema = new mongoose.Schema({
    employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true,
    },
    file: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'File',
        default: null,
    },
    fileName: {
        type: String,
        required: true,
    },
    department: {
        type: String,
        default: 'General',
    },
    downloadedAt: {
        type: Date,
        default: Date.now,
        index: true,
    },
}, {
    timestamps: true,
});

downloadLogSchema.index({ employee: 1, downloadedAt: -1 });

module.exports = mongoose.model('DownloadLog', downloadLogSchema);
