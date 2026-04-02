import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProjectService, assertValidTransition } from '@/server/services/project.service'
import { ProjectStatus } from '@/generated/prisma/client'

const { mockProject } = vi.hoisted(() => {
  const mockProject = {
    findUnique: vi.fn(),
    findUniqueOrThrow: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
  }
  return { mockProject }
})

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    project: mockProject,
  },
}))

// Typed mock accessor
const mockPrisma = {
  project: mockProject as {
    findUnique: ReturnType<typeof vi.fn>;
    findUniqueOrThrow: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  },
}

// ---------------------------------------------------------------------------
// assertValidTransition
// ---------------------------------------------------------------------------
describe('assertValidTransition', () => {
  it('does not throw for a valid transition', () => {
    expect(() => assertValidTransition(ProjectStatus.DRAFT, ProjectStatus.UPLOADED)).not.toThrow()
    expect(() => assertValidTransition(ProjectStatus.UPLOADED, ProjectStatus.ANALYZING)).not.toThrow()
    expect(() => assertValidTransition(ProjectStatus.ANALYZING, ProjectStatus.ANALYZED)).not.toThrow()
  })

  it('throws for an invalid transition', () => {
    expect(() => assertValidTransition(ProjectStatus.DRAFT, ProjectStatus.ANALYZED)).toThrow(
      /Invalid project status transition/
    )
    expect(() => assertValidTransition(ProjectStatus.RENDERED, ProjectStatus.DRAFT)).toThrow(
      /Invalid project status transition/
    )
  })
})

// ---------------------------------------------------------------------------
// ProjectService.transitionStatus
// ---------------------------------------------------------------------------
describe('ProjectService.transitionStatus', () => {
  const projectId = 'proj-123'
  const updatedProject = {
    id: projectId,
    status: ProjectStatus.ANALYZING,
    name: 'Test',
    description: null,
    userId: 'user-1',
    sourceVideoId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the updated project when updateMany matches 1 row', async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      ...updatedProject,
      status: ProjectStatus.UPLOADED,
    })
    mockPrisma.project.updateMany.mockResolvedValue({ count: 1 })
    mockPrisma.project.findUniqueOrThrow.mockResolvedValue({
      ...updatedProject,
      status: ProjectStatus.ANALYZING,
    })

    const result = await ProjectService.transitionStatus(projectId, ProjectStatus.ANALYZING)

    expect(result.status).toBe(ProjectStatus.ANALYZING)
  })

  it('throws StaleStatusError when updateMany matches 0 rows (race condition)', async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      ...updatedProject,
      status: ProjectStatus.UPLOADED,
    })
    mockPrisma.project.updateMany.mockResolvedValue({ count: 0 })

    await expect(
      ProjectService.transitionStatus(projectId, ProjectStatus.ANALYZING)
    ).rejects.toThrow(/Stale status transition/)
  })

  it('throws when project is not found', async () => {
    mockPrisma.project.findUnique.mockResolvedValue(null)

    await expect(
      ProjectService.transitionStatus(projectId, ProjectStatus.ANALYZING)
    ).rejects.toThrow(/not found/)
  })

  it('throws for an invalid transition', async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      ...updatedProject,
      status: ProjectStatus.DRAFT,
    })

    await expect(
      ProjectService.transitionStatus(projectId, ProjectStatus.ANALYZED)
    ).rejects.toThrow(/Invalid project status transition/)
  })

  it('calls updateMany with WHERE containing { id, status: fromStatus }', async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      ...updatedProject,
      status: ProjectStatus.UPLOADED,
    })
    mockPrisma.project.updateMany.mockResolvedValue({ count: 1 })
    mockPrisma.project.findUniqueOrThrow.mockResolvedValue({
      ...updatedProject,
      status: ProjectStatus.ANALYZING,
    })

    await ProjectService.transitionStatus(projectId, ProjectStatus.ANALYZING)

    expect(mockPrisma.project.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: projectId,
          status: ProjectStatus.UPLOADED, // the "from" status used as atomic guard
        }),
        data: expect.objectContaining({
          status: ProjectStatus.ANALYZING,
        }),
      })
    )
  })

  it('does NOT call updateMany if transition is invalid (guard fires first)', async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      ...updatedProject,
      status: ProjectStatus.DRAFT,
    })

    await expect(
      ProjectService.transitionStatus(projectId, ProjectStatus.RENDERED)
    ).rejects.toThrow()

    expect(mockPrisma.project.updateMany).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// ProjectService.markUploaded
// ---------------------------------------------------------------------------
describe('ProjectService.markUploaded', () => {
  const projectId = 'proj-456'
  const assetId = 'asset-789'
  const baseProject = {
    id: projectId,
    status: ProjectStatus.DRAFT,
    name: 'Test',
    description: null,
    userId: 'user-1',
    sourceVideoId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls updateMany with status filter (atomic guard)', async () => {
    mockPrisma.project.findUnique.mockResolvedValue({ ...baseProject, status: ProjectStatus.DRAFT })
    mockPrisma.project.updateMany.mockResolvedValue({ count: 1 })
    mockPrisma.project.findUniqueOrThrow.mockResolvedValue({
      ...baseProject,
      status: ProjectStatus.UPLOADED,
      sourceVideoId: assetId,
    })

    await ProjectService.markUploaded(projectId, assetId)

    expect(mockPrisma.project.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: projectId,
          status: ProjectStatus.DRAFT,
        }),
        data: expect.objectContaining({
          status: ProjectStatus.UPLOADED,
          sourceVideoId: assetId,
        }),
      })
    )
  })

  it('sets sourceVideoId on the project', async () => {
    mockPrisma.project.findUnique.mockResolvedValue({ ...baseProject, status: ProjectStatus.DRAFT })
    mockPrisma.project.updateMany.mockResolvedValue({ count: 1 })
    mockPrisma.project.findUniqueOrThrow.mockResolvedValue({
      ...baseProject,
      status: ProjectStatus.UPLOADED,
      sourceVideoId: assetId,
    })

    const result = await ProjectService.markUploaded(projectId, assetId)

    expect(result.sourceVideoId).toBe(assetId)
    expect(result.status).toBe(ProjectStatus.UPLOADED)
  })

  it('throws when project is not found', async () => {
    mockPrisma.project.findUnique.mockResolvedValue(null)

    await expect(
      ProjectService.markUploaded(projectId, assetId)
    ).rejects.toThrow(/not found/)
  })

  it('throws StaleStatusError when updateMany matches 0 rows', async () => {
    mockPrisma.project.findUnique.mockResolvedValue({ ...baseProject, status: ProjectStatus.DRAFT })
    mockPrisma.project.updateMany.mockResolvedValue({ count: 0 })

    await expect(
      ProjectService.markUploaded(projectId, assetId)
    ).rejects.toThrow(/Stale status transition/)
  })

  it('throws for invalid from-status (no path to UPLOADED from ANALYZED)', async () => {
    mockPrisma.project.findUnique.mockResolvedValue({
      ...baseProject,
      status: ProjectStatus.ANALYZED,
    })

    await expect(
      ProjectService.markUploaded(projectId, assetId)
    ).rejects.toThrow(/Invalid project status transition/)
  })
})

// ---------------------------------------------------------------------------
// ProjectService convenience mark* methods (delegate to transitionStatus)
// ---------------------------------------------------------------------------
describe('ProjectService convenience mark* methods', () => {
  const projectId = 'proj-999'
  const baseProject = {
    id: projectId,
    name: 'Test',
    description: null,
    userId: 'user-1',
    sourceVideoId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('markAnalyzing transitions UPLOADED -> ANALYZING', async () => {
    mockPrisma.project.findUnique.mockResolvedValue({ ...baseProject, status: ProjectStatus.UPLOADED })
    mockPrisma.project.updateMany.mockResolvedValue({ count: 1 })
    mockPrisma.project.findUniqueOrThrow.mockResolvedValue({ ...baseProject, status: ProjectStatus.ANALYZING })

    const result = await ProjectService.markAnalyzing(projectId)
    expect(result.status).toBe(ProjectStatus.ANALYZING)
  })

  it('markFailed calls prisma.project.update directly (bypasses TOCTOU guard)', async () => {
    mockPrisma.project.update.mockResolvedValue({ ...baseProject, status: ProjectStatus.FAILED })

    const result = await ProjectService.markFailed(projectId)
    expect(result.status).toBe(ProjectStatus.FAILED)
    expect(mockPrisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: projectId },
        data: { status: ProjectStatus.FAILED },
      })
    )
    // updateMany should NOT have been called for markFailed
    expect(mockPrisma.project.updateMany).not.toHaveBeenCalled()
  })
})
