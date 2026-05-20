// const { jest } = require('@jest/globals');

// 1. Mock Supabase
jest.mock('@supabase/supabase-js', () => {
    return {
        createClient: jest.fn(() => ({
            auth: {
                getUser: jest.fn() // Will be implemented in tests or here
            },
            from: jest.fn(() => ({
                select: jest.fn().mockReturnThis(),
                insert: jest.fn().mockReturnThis(),
                update: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({ data: {}, error: null })
            }))
        }))
    };
});

// 2. Mock BullMQ
jest.mock('bullmq', () => {
    return {
        Queue: jest.fn().mockImplementation(() => ({
            add: jest.fn(),
            on: jest.fn(),
            close: jest.fn(),
        }))
    };
});

// 3. Mock Google Gemini
jest.mock('@google/generative-ai', () => {
    return {
        GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
            getGenerativeModel: jest.fn(() => ({
                generateContent: jest.fn().mockResolvedValue({
                    response: {
                        text: () => JSON.stringify({ score: 85, feedback: "Mocked AI Feedback: Good job!", confidence: 0.9 })
                    }
                })
            }))
        }))
    };
});

// 4. Mock Postgres Pool (Critical for Auth/DB interaction without Real DB)
jest.mock('../config/db', () => {
    const mPool = {
        query: jest.fn(),
        connect: jest.fn(),
        on: jest.fn(),
        end: jest.fn()
    };
    return mPool;
});


// Suppress console logs during tests to keep output clean
global.console = {
    ...console,
    // log: jest.fn(), // Uncomment to strict silence
    // error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
};
