// const { jest } = require('@jest/globals');

// --- MOCKS (Must be defined before requiring modules) ---

// 1. Mock Supabase
jest.mock('@supabase/supabase-js', () => {
    return {
        createClient: jest.fn(() => ({
            auth: {
                getUser: jest.fn()
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

// 2. Mock BullMQ (Required because server.js loads queues)
jest.mock('bullmq', () => {
    return {
        Queue: jest.fn().mockImplementation(() => ({
            add: jest.fn(),
            on: jest.fn(),
            close: jest.fn(),
        })),
        Worker: jest.fn().mockImplementation(() => ({
            on: jest.fn(),
            close: jest.fn(),
        }))
    };
});

// 3. Mock Google Gemini (Required because server.js might load AI services)
jest.mock('@google/generative-ai', () => {
    return {
        GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
            getGenerativeModel: jest.fn(() => ({
                generateContent: jest.fn().mockResolvedValue({
                    response: {
                        text: () => JSON.stringify({ score: 85, feedback: "Mocked AI Feedback" })
                    }
                })
            }))
        }))
    };
});

// 4. Mock Postgres Pool
jest.mock('../config/db', () => {
    return {
        query: jest.fn(),
        connect: jest.fn(),
        on: jest.fn(),
        end: jest.fn()
    };
});

// 5. Mock IORedis (Prevent real connection in config/redis.js)
jest.mock('ioredis', () => {
    return jest.fn().mockImplementation(() => ({
        on: jest.fn(),
        connect: jest.fn(),
        disconnect: jest.fn(),
        quit: jest.fn()
    }));
});

// Mock console to reduce noise
global.console = { ...console, log: jest.fn(), warn: jest.fn(), error: jest.fn() };

// --- IMPORTS ---
const request = require('supertest');
const app = require('../server');
const supabase = require('../config/supabaseClient');
const pool = require('../config/db');

describe('Auth & Security Tests', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/auth/validate-role', () => {

        it('Test Case A: Valid Student Token -> Returns 200 & Role student', async () => {
            supabase.auth.getUser.mockResolvedValue({
                data: { user: { id: 'student-123' } },
                error: null
            });

            pool.query.mockResolvedValue({
                rows: [{
                    id: 'student-123',
                    role: 'student',
                    email: 'student@gmail.com',
                    full_name: 'Test Student',
                    avatar_url: null
                }]
            });

            const res = await request(app)
                .post('/api/auth/validate-role')
                .set('Authorization', 'Bearer valid-student-token');

            expect(res.statusCode).toBe(200);
            expect(res.body.user.role).toBe('student');
        });

        it('Test Case B: Valid Admin Token -> Returns 200 & Role admin', async () => {
            supabase.auth.getUser.mockResolvedValue({
                data: { user: { id: 'admin-123' } },
                error: null
            });

            pool.query.mockResolvedValue({
                rows: [{
                    id: 'admin-123',
                    role: 'admin',
                    email: 'admin@test.com',
                    full_name: 'Admin User'
                }]
            });

            const res = await request(app)
                .post('/api/auth/validate-role')
                .set('Authorization', 'Bearer valid-admin-token');

            expect(res.statusCode).toBe(200);
            expect(res.body.user.role).toBe('admin');
        });

        it('Test Case C: Invalid Token -> Returns 401', async () => {
            supabase.auth.getUser.mockResolvedValue({
                data: { user: null },
                error: { message: "Invalid token" }
            });

            const res = await request(app)
                .post('/api/auth/validate-role')
                .set('Authorization', 'Bearer invalid-token');

            expect(res.statusCode).toBe(401);
        });
    });

    describe('Security Checks', () => {
        it('Should have Helmet headers', async () => {
            const res = await request(app).get('/');
            expect(res.headers).toHaveProperty('x-dns-prefetch-control');
        });

        it('Should return 404 for non-existent routes', async () => {
            const res = await request(app).get('/api/unknown/route');
            expect(res.statusCode).toBe(404);
        });
    });
});
