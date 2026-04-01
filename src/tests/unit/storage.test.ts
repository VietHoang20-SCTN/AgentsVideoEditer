import { describe, it, expect, vi, beforeEach } from 'vitest'
import path from 'path'

// Mock fs/promises (used as: import fs from 'fs/promises')
vi.mock('fs/promises', () => ({
  default: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue(Buffer.from('file data')),
    access: vi.fn().mockResolvedValue(undefined),
  },
}))

// Mock 'fs' for createWriteStream used in saveStream
vi.mock('fs', () => ({
  default: {
    createWriteStream: vi.fn(),
  },
  createWriteStream: vi.fn(),
}))

// Mock stream and stream/promises for saveStream
vi.mock('stream', () => ({
  Readable: {
    fromWeb: vi.fn(),
  },
}))

vi.mock('stream/promises', () => ({
  pipeline: vi.fn().mockResolvedValue(undefined),
}))

describe('LocalStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('save()', () => {
    it('creates directory and writes file', async () => {
      const { LocalStorage } = await import('@/lib/storage/local')
      const fsMock = (await import('fs/promises')).default

      const storage = new LocalStorage()
      const buffer = Buffer.from('test video data')
      await storage.save('uploads/test.mp4', buffer)

      expect(fsMock.mkdir).toHaveBeenCalledTimes(1)
      expect(fsMock.mkdir).toHaveBeenCalledWith(
        expect.stringContaining('uploads'),
        { recursive: true }
      )
      expect(fsMock.writeFile).toHaveBeenCalledTimes(1)
      expect(fsMock.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('test.mp4'),
        buffer
      )
    })

    it('writes file to correct path derived from UPLOAD_DIR', async () => {
      const { LocalStorage } = await import('@/lib/storage/local')
      const fsMock = (await import('fs/promises')).default

      const storage = new LocalStorage()
      await storage.save('subdir/video.mp4', Buffer.from('data'))

      const writePath = (fsMock.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
      expect(writePath).toContain('video.mp4')
    })
  })

  describe('delete()', () => {
    it('calls unlink with correct path', async () => {
      const { LocalStorage } = await import('@/lib/storage/local')
      const fsMock = (await import('fs/promises')).default

      const storage = new LocalStorage()
      await storage.delete('uploads/test.mp4')

      expect(fsMock.unlink).toHaveBeenCalledTimes(1)
      const unlinkPath = (fsMock.unlink as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
      expect(unlinkPath).toContain('test.mp4')
    })

    it('ignores ENOENT error (idempotent delete)', async () => {
      const { LocalStorage } = await import('@/lib/storage/local')
      const fsMock = (await import('fs/promises')).default

      const enoentError = Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
      ;(fsMock.unlink as ReturnType<typeof vi.fn>).mockRejectedValueOnce(enoentError)

      const storage = new LocalStorage()
      // Should NOT throw
      await expect(storage.delete('uploads/nonexistent.mp4')).resolves.toBeUndefined()
    })

    it('re-throws non-ENOENT errors', async () => {
      const { LocalStorage } = await import('@/lib/storage/local')
      const fsMock = (await import('fs/promises')).default

      const permError = Object.assign(new Error('EPERM'), { code: 'EPERM' })
      ;(fsMock.unlink as ReturnType<typeof vi.fn>).mockRejectedValueOnce(permError)

      const storage = new LocalStorage()
      await expect(storage.delete('uploads/protected.mp4')).rejects.toThrow('EPERM')
    })
  })

  describe('get()', () => {
    it('reads file from correct path', async () => {
      const { LocalStorage } = await import('@/lib/storage/local')
      const fsMock = (await import('fs/promises')).default

      const mockData = Buffer.from('video content')
      ;(fsMock.readFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockData)

      const storage = new LocalStorage()
      const result = await storage.get('uploads/test.mp4')

      expect(result).toBe(mockData)
      const readPath = (fsMock.readFile as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
      expect(readPath).toContain('test.mp4')
    })
  })

  describe('exists()', () => {
    it('returns true when file is accessible', async () => {
      const { LocalStorage } = await import('@/lib/storage/local')
      const fsMock = (await import('fs/promises')).default

      ;(fsMock.access as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined)

      const storage = new LocalStorage()
      const result = await storage.exists('uploads/test.mp4')

      expect(result).toBe(true)
    })

    it('returns false when file is not accessible', async () => {
      const { LocalStorage } = await import('@/lib/storage/local')
      const fsMock = (await import('fs/promises')).default

      ;(fsMock.access as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('ENOENT'))

      const storage = new LocalStorage()
      const result = await storage.exists('uploads/missing.mp4')

      expect(result).toBe(false)
    })
  })

  describe('getPath()', () => {
    it('resolves key relative to UPLOAD_DIR', async () => {
      const { LocalStorage } = await import('@/lib/storage/local')

      const storage = new LocalStorage()
      const resolvedPath = storage.getPath('uploads/test.mp4')

      // Should be an absolute path containing the key
      expect(path.isAbsolute(resolvedPath)).toBe(true)
      expect(resolvedPath).toContain('test.mp4')
    })
  })
})
