const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage Configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix =
            Date.now() + "-" + Math.round(Math.random() * 1e9);

        cb(
            null,
            uniqueSuffix + path.extname(file.originalname)
        );
    },
});

// File Filter
const fileFilter = (req, file, cb) => {
    const allowedExtensions = [
        ".jpg",
        ".jpeg",
        ".png",
        ".pdf",
        ".csv",
        ".xls",
        ".xlsx",
    ];

    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedExtensions.includes(ext)) {
        cb(null, true);
    } else {
        cb(
            new Error(
                "Upload failed: Only Images, PDFs, CSVs, and Excel files are allowed!"
            )
        );
    }
};

const upload = multer({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024,
    },
    fileFilter,
});

module.exports = upload;