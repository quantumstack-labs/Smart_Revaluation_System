const { createLogger, transports, format } = require("winston");

// Determine logging level dynamically based on environment
const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "warn" : "debug");

const logger = createLogger({
    level: level,
    format: format.combine(
        format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        format.errors({ stack: true }),
        format.json()
    ),
    transports: [
        // Error logs rotation (max 5MB per file, max 5 files rotated)
        new transports.File({ 
            filename: "logs/error.log", 
            level: "error",
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            tailable: true
        }),
        // Combined logs rotation (max 5MB per file, max 5 files rotated)
        new transports.File({ 
            filename: "logs/combined.log",
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            tailable: true
        })
    ]
});

// For development mode, add colorized and simplified console output
if (process.env.NODE_ENV !== "production") {
    logger.add(new transports.Console({
        format: format.combine(
            format.colorize(),
            format.printf(({ timestamp, level, message, stack }) => {
                if (stack) {
                    return `[${timestamp}] ${level}: ${message}\n${stack}`;
                }
                return `[${timestamp}] ${level}: ${message}`;
            })
        )
    }));
}

module.exports = logger;
