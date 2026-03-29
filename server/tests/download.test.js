import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const mockSupabase = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn()
      }))
    }))
  }))
};

vi.mock('../../services/supabase.js', () => ({
  createSupabaseClient: () => mockSupabase
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase)
}));

vi.mock('pdf-lib', () => ({
  PDFDocument: {
    load: vi.fn(() => Promise.resolve({
      getPages: vi.fn(() => [{ getSize: () => ({ width: 100, height: 100 }) }]),
      embedFont: vi.fn(() => Promise.resolve({ widthOfTextAtSize: () => 50 })),
      save: vi.fn(() => Promise.resolve(Buffer.from('pdf')))
    }))
  },
  StandardFonts: { Helvetica: 'helvetica' },
  rgb: vi.fn()
}));

vi.mock('jszip', () => ({
  default: {
    loadAsync: vi.fn(),
    file: vi.fn(),
    generateAsync: vi.fn(() => Promise.resolve(Buffer.from('zip')))
  }
}));

vi.mock('../../services/cloudinary.js', () => ({
  buildWatermarkText: vi.fn(() => 'WATERMARK_TEXT'),
  validateCloudinaryConfig: vi.fn(async () => ({
    configured: false,
    cloudName: false,
    apiKey: false,
    apiSecret: false,
    status: 'Missing Cloudinary credentials. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in server/.env'
  }))
}));

const {
  default: downloadRouter,
  resetDownloadRateLimitForTests
} = await import('../../routes/download.js');

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.set('supabase', mockSupabase);
  app.use('/api/download', downloadRouter);
  return app;
}

function getValidMockUser() {
  return { id: 'user-123', email: 'test@example.com' };
}

function getMockPaper() {
  return {
    id: 'paper-123',
    title: 'Test Paper',
    file_url: 'https://example.com/test.pdf',
    status: 'approved'
  };
}

describe('Download Routes - Authorization', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();
    resetDownloadRateLimitForTests();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('GET /api/download/health', () => {
    it('should return server health status', async () => {
      const res = await request(app).get('/api/download/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('server');
      expect(res.body).toHaveProperty('cloudinary');
    });
  });

  describe('POST /api/download/initiate - Authorization Header Tests', () => {
    it('should reject requests without Authorization header', async () => {
      const res = await request(app)
        .post('/api/download/initiate')
        .send({ paperId: 'paper-123' });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Bearer token required');
    });

    it('should reject requests with invalid Authorization header format', async () => {
      const res = await request(app)
        .post('/api/download/initiate')
        .set('Authorization', 'Invalid token')
        .send({ paperId: 'paper-123' });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Bearer token required');
    });

    it('should reject requests with empty Bearer token', async () => {
      const res = await request(app)
        .post('/api/download/initiate')
        .set('Authorization', 'Bearer ')
        .send({ paperId: 'paper-123' });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Bearer token required');
    });

    it('should reject requests with invalid/missing authToken in body (security check)', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: getValidMockUser() },
        error: null
      });

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'papers') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: getMockPaper(), error: null })
              })
            })
          };
        }
        if (table === 'download_tokens') {
          return {
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({
                  data: { expires_at: new Date(Date.now() + 3600000).toISOString() },
                  error: null
                })
              })
            })
          };
        }
        if (table === 'downloads') {
          return {
            insert: () => Promise.resolve({ error: null })
          };
        }
        return {};
      });

      const res = await request(app)
        .post('/api/download/initiate')
        .set('Authorization', 'Bearer valid-token')
        .send({ paperId: 'paper-123' });

      const body = res.body;
      expect(body).not.toHaveProperty('authToken');
      expect(body.downloadUrl).toBeDefined();
    });
  });
});

describe('Download Routes - Rate Limiting', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();
    resetDownloadRateLimitForTests();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rate Limit Enforcement', () => {
    it('should allow downloads until limit is reached (5 downloads)', async () => {
      const user = getValidMockUser();

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user },
        error: null
      });

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'papers') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: getMockPaper(), error: null })
              })
            })
          };
        }
        if (table === 'download_tokens') {
          return {
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({
                  data: { expires_at: new Date(Date.now() + 3600000).toISOString() },
                  error: null
                })
              })
            })
          };
        }
        if (table === 'downloads') {
          return {
            insert: () => Promise.resolve({ error: null })
          };
        }
        return {};
      });

      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .post('/api/download/initiate')
          .set('Authorization', 'Bearer valid-token')
          .send({ paperId: 'paper-123' });

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('downloadUrl');
        expect(res.body).toHaveProperty('token');
      }
    });

    it('should block the 6th download attempt with 429 status', async () => {
      const user = getValidMockUser();

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user },
        error: null
      });

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'papers') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: getMockPaper(), error: null })
              })
            })
          };
        }
        if (table === 'download_tokens') {
          return {
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({
                  data: { expires_at: new Date(Date.now() + 3600000).toISOString() },
                  error: null
                })
              })
            })
          };
        }
        if (table === 'downloads') {
          return {
            insert: () => Promise.resolve({ error: null })
          };
        }
        return {};
      });

      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/download/initiate')
          .set('Authorization', 'Bearer valid-token')
          .send({ paperId: 'paper-123' });
      }

      const res = await request(app)
        .post('/api/download/initiate')
        .set('Authorization', 'Bearer valid-token')
        .send({ paperId: 'paper-123' });

      expect(res.status).toBe(429);
      expect(res.body.error).toContain('Rate limit exceeded');
      expect(res.body).toHaveProperty('nextAvailableTime');
      expect(res.body).toHaveProperty('retryAfter');
    });

    it('should include nextAvailableTime in rate limit error response', async () => {
      const user = getValidMockUser();

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user },
        error: null
      });

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'papers') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: getMockPaper(), error: null })
              })
            })
          };
        }
        if (table === 'download_tokens') {
          return {
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({
                  data: { expires_at: new Date(Date.now() + 3600000).toISOString() },
                  error: null
                })
              })
            })
          };
        }
        if (table === 'downloads') {
          return {
            insert: () => Promise.resolve({ error: null })
          };
        }
        return {};
      });

      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/download/initiate')
          .set('Authorization', 'Bearer valid-token')
          .send({ paperId: 'paper-123' });
      }

      const res = await request(app)
        .post('/api/download/initiate')
        .set('Authorization', 'Bearer valid-token')
        .send({ paperId: 'paper-123' });

      expect(res.status).toBe(429);
      expect(res.body.nextAvailableTime).toBeDefined();

      const nextAvailable = new Date(res.body.nextAvailableTime);
      const threeHoursFromNow = new Date(Date.now() + 3 * 60 * 60 * 1000);
      expect(nextAvailable.getTime()).toBeCloseTo(threeHoursFromNow.getTime(), -3);
    });

    it('should reset rate limit after 3-hour window expires', async () => {
      const user = getValidMockUser();

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user },
        error: null
      });

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'papers') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: getMockPaper(), error: null })
              })
            })
          };
        }
        if (table === 'download_tokens') {
          return {
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({
                  data: { expires_at: new Date(Date.now() + 3600000).toISOString() },
                  error: null
                })
              })
            })
          };
        }
        if (table === 'downloads') {
          return {
            insert: () => Promise.resolve({ error: null })
          };
        }
        return {};
      });

      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/download/initiate')
          .set('Authorization', 'Bearer valid-token')
          .send({ paperId: 'paper-123' });
      }

      const blockedRes = await request(app)
        .post('/api/download/initiate')
        .set('Authorization', 'Bearer valid-token')
        .send({ paperId: 'paper-123' });

      expect(blockedRes.status).toBe(429);

      vi.advanceTimersByTime(3 * 60 * 60 * 1000 + 1000);

      const allowedRes = await request(app)
        .post('/api/download/initiate')
        .set('Authorization', 'Bearer valid-token')
        .send({ paperId: 'paper-123' });

      expect(allowedRes.status).toBe(200);
    });

    it('should apply rate limit per user, not globally', async () => {
      const user1 = { id: 'user-1', email: 'user1@example.com' };
      const user2 = { id: 'user-2', email: 'user2@example.com' };

      mockSupabase.auth.getUser.mockImplementation((token) => {
        if (token === 'token-user1') {
          return Promise.resolve({ data: { user: user1 }, error: null });
        }
        if (token === 'token-user2') {
          return Promise.resolve({ data: { user: user2 }, error: null });
        }
        return Promise.resolve({ data: { user: null }, error: 'Invalid token' });
      });

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'papers') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: getMockPaper(), error: null })
              })
            })
          };
        }
        if (table === 'download_tokens') {
          return {
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({
                  data: { expires_at: new Date(Date.now() + 3600000).toISOString() },
                  error: null
                })
              })
            })
          };
        }
        if (table === 'downloads') {
          return {
            insert: () => Promise.resolve({ error: null })
          };
        }
        return {};
      });

      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/download/initiate')
          .set('Authorization', 'Bearer token-user1')
          .send({ paperId: 'paper-123' });
      }

      await request(app)
        .post('/api/download/initiate')
        .set('Authorization', 'Bearer token-user1')
        .send({ paperId: 'paper-123' });

      const user2FirstRes = await request(app)
        .post('/api/download/initiate')
        .set('Authorization', 'Bearer token-user2')
        .send({ paperId: 'paper-123' });

      expect(user2FirstRes.status).toBe(200);
    });
  });
});

describe('Download Routes - Error Handling', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
    vi.clearAllMocks();
    resetDownloadRateLimitForTests();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Authentication Errors', () => {
    it('should return 401 when token is invalid or expired', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid or expired token' }
      });

      const res = await request(app)
        .post('/api/download/initiate')
        .set('Authorization', 'Bearer invalid-token')
        .send({ paperId: 'paper-123' });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid or expired');
    });

    it('should return 400 when paperId is missing', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: getValidMockUser() },
        error: null
      });

      const res = await request(app)
        .post('/api/download/initiate')
        .set('Authorization', 'Bearer valid-token')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('paperId');
    });

    it('should return 404 when paper is not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: getValidMockUser() },
        error: null
      });

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'papers') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: null, error: { message: 'Not found' } })
              })
            })
          };
        }
        return {};
      });

      const res = await request(app)
        .post('/api/download/initiate')
        .set('Authorization', 'Bearer valid-token')
        .send({ paperId: 'nonexistent-paper' });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Paper not found');
    });

    it('should return 403 when paper is not approved', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: getValidMockUser() },
        error: null
      });

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'papers') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: { ...getMockPaper(), status: 'pending' },
                  error: null
                })
              })
            })
          };
        }
        return {};
      });

      const res = await request(app)
        .post('/api/download/initiate')
        .set('Authorization', 'Bearer valid-token')
        .send({ paperId: 'paper-123' });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('not available');
    });
  });
});