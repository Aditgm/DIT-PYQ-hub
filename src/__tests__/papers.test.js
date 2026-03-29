import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockFetch = vi.fn()

global.fetch = mockFetch

const { initiateDownload, revokeDownloadToken } = await import('../api/papers')

describe('papers.js API - Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initiateDownload - Authorization Header', () => {
    it('should include Authorization header with Bearer token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ downloadUrl: 'http://test.com/file', token: 'abc123' })
      })

      await initiateDownload('paper-123', 'user-auth-token')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/download/initiate'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer user-auth-token'
          })
        })
      )
    })

    it('should NOT include authToken in request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ downloadUrl: 'http://test.com/file', token: 'abc123' })
      })

      await initiateDownload('paper-123', 'user-auth-token')

      const callArg = mockFetch.mock.calls[0][1]
      const body = JSON.parse(callArg.body)
      expect(body).not.toHaveProperty('authToken')
      expect(body).toHaveProperty('paperId')
      expect(body.paperId).toBe('paper-123')
    })

    it('should throw error with nextAvailableTime when rate limited', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          error: 'Rate limit exceeded',
          nextAvailableTime: '2026-03-29T18:00:00+05:30'
        })
      })

      try {
        await initiateDownload('paper-123', 'user-auth-token')
        expect.fail('Should have thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(Error)
        expect(err.message).toContain('Rate limit exceeded')
        expect(err.nextAvailableTime).toBe('2026-03-29T18:00:00+05:30')
      }
    })

    it('should throw error without nextAvailableTime for non-rate-limit errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          error: 'Paper not found'
        })
      })

      try {
        await initiateDownload('paper-123', 'user-auth-token')
        expect.fail('Should have thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(Error)
        expect(err.message).toContain('Paper not found')
        expect(err.nextAvailableTime).toBeUndefined()
      }
    })
  })

  describe('revokeDownloadToken - Authorization Header', () => {
    it('should include Authorization header with Bearer token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, revoked: true })
      })

      await revokeDownloadToken('download-token', 'user-auth-token')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/download/revoke'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer user-auth-token'
          })
        })
      )
    })

    it('should NOT include authToken in request body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, revoked: true })
      })

      await revokeDownloadToken('download-token', 'user-auth-token')

      const callArg = mockFetch.mock.calls[0][1]
      const body = JSON.parse(callArg.body)
      expect(body).not.toHaveProperty('authToken')
      expect(body).toHaveProperty('token')
      expect(body.token).toBe('download-token')
    })
  })
})