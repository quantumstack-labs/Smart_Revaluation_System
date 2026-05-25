const { Pool } = require("pg");
const path = require("path");
const logger = require("./logger");

// 1. Force dotenv to look in the specific backend folder
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

logger.debug("🛑 --- DEBUGGING DATABASE CONNECTION ---");
logger.debug(`1. Current Directory: ${__dirname}`);
logger.debug(`2. Expected .env Path: ${path.resolve(__dirname, "../.env")}`);
logger.debug(`3. DATABASE_URL Value: ${process.env.DATABASE_URL ? "FOUND (Starts with " + process.env.DATABASE_URL.substring(0, 10) + "...)" : "❌ UNDEFINED (MISSING)"}`);
logger.debug("🛑 -------------------------------------");

// 2. Prevent crash if variable is missing
if (!process.env.DATABASE_URL) {
    logger.error("❌ CRITICAL ERROR: DATABASE_URL is missing. Please check your .env file.");
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

module.exports = pool;