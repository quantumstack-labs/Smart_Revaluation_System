// const { jest } = require('@jest/globals');

// --- MOCKS ---

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

// 2. Mock BullMQ
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

// 3. Mock Google Gemini
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

// global.console = { ...console, log: jest.fn(), warn: jest.fn(), error: jest.fn() };

// --- IMPORTS ---
const request = require('supertest');
const app = require('../server');
const supabase = require('../config/supabaseClient');
const pool = require('../config/db');
const { gradingProcessor } = require('../workers/gradingProcessor');

describe('Full Lifecycle Test: Revaluation Flow', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('Step 1: Student submits a revaluation request', async () => {
        supabase.auth.getUser.mockResolvedValue({
            data: { user: { id: 'student-123' } },
            error: null
        });

        pool.query
            .mockResolvedValueOnce({ rows: [{ id: 'student-123', role: 'student' }] })
            .mockResolvedValueOnce({ rows: [{ user_id: 'student-123', department: 'CSE' }] })
            .mockResolvedValueOnce({ rows: [{ id: 101 }] })
            .mockResolvedValueOnce({ rows: [] })
            .mockResolvedValueOnce({ rows: [{ id: 'teacher-1' }] })
            .mockResolvedValueOnce({ rows: [{ id: 500, status: 'Pending' }] });

        const res = await request(app)
            .post('/api/revaluation/create')
            .set('Authorization', 'Bearer student-token')
            .send({ subject_name: 'Mathematics' });

        expect(res.statusCode).toBe(201);
        expect(res.body.request.id).toBe(500);
    });

    it('Step 2: AI Worker processes the request', async () => {
        const mockRequestData = {
            id: 500,
            subject_code: 'MATH101',
            subject_name: 'Mathematics',
            email: 'student@test.com',
            ocr_data: 'Student Answer Text...'
        };
        const mockAnswerKey = { extracted_text: 'Official Answer Key Text...' };

        pool.query
            .mockResolvedValueOnce({ rows: [mockRequestData] })
            .mockResolvedValueOnce({ rows: [mockAnswerKey] })
            .mockResolvedValueOnce({ rowCount: 1 });

        const job = { id: 'job-1', data: { requestId: 500 } };
        const result = await gradingProcessor(job);

        expect(result.score).toBe(85);

        const updateCall = pool.query.mock.calls[2];
        expect(updateCall[0]).toContain('UPDATE revaluation_requests');
    });

    it('Step 3: Teacher views the dashboard', async () => {
        supabase.auth.getUser.mockResolvedValue({
            data: { user: { id: 'teacher-1' } },
            error: null
        });

        pool.query
            .mockResolvedValueOnce({ rows: [{ id: 'teacher-1', role: 'teacher' }] })
            .mockResolvedValueOnce({ rows: [{ user_id: 'teacher-1', department: 'CSE' }] })
            .mockResolvedValueOnce({ rows: [{ id: 500, subject: 'Mathematics', status: 'PUBLISHED', score: 85 }] });

        const res = await request(app)
            .get('/api/teacher/dashboard')
            .set('Authorization', 'Bearer teacher-token');

        expect(res.statusCode).toBe(200);
        expect(res.body.revaluation_requests).toHaveLength(1);
    });

    it('Step 4: Teacher updates/confirms status', async () => {
        supabase.auth.getUser.mockResolvedValue({
            data: { user: { id: 'teacher-1' } },
            error: null
        });

        pool.query
            .mockResolvedValueOnce({ rows: [{ id: 'teacher-1', role: 'teacher' }] }) // Middleware auth check
            .mockResolvedValueOnce({ rows: [{ id: 500, student_id: 'student-123', student_email: 'student@test.com', student_name: 'Test Student', subject_code: 'MATH101', subject_name: 'Mathematics' }] }) // requestDataQuery check
            .mockResolvedValueOnce({ rows: [{ id: 500, status: 'COMPLETED' }], rowCount: 1 }); // updateQuery execution

        const res = await request(app)
            .put('/api/teacher/request/status')
            .set('Authorization', 'Bearer teacher-token')
            .send({
                requestId: 500,
                status: 'COMPLETED',
                studentEmail: 'student@test.com'
            });

        expect(res.statusCode).toBe(200);
    });

    it('Step 5: Public user checks status', async () => {
        const { createClient } = require('@supabase/supabase-js');
        createClient.mockImplementationOnce(() => ({
            from: jest.fn(() => ({
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                single: jest.fn().mockResolvedValue({
                    data: {
                        id: 'a0000000-0000-0000-0000-000000000500',
                        status: 'COMPLETED',
                        created_at: new Date().toISOString(),
                        users: { full_name: 'Rahul Kumar' },
                        subjects: { code: 'MATH101', name: 'Mathematics' }
                    },
                    error: null
                })
            }))
        }));

        const res = await request(app)
            .get('/api/public/status/a0000000-0000-0000-0000-000000000500');

        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('COMPLETED');
    });

});
