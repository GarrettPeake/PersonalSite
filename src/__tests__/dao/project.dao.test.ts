/**
 * Project DAO Tests
 *
 * Tests for project CRUD and reorder operations using D1.
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import {
  getProject,
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  reorderProjects,
} from '../../dao/project.dao';

describe('Project DAO', () => {
  beforeAll(async () => {
    await env.DB.exec('PRAGMA foreign_keys = ON');
    await env.DB.exec(
      "CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, title TEXT NOT NULL DEFAULT '', icon TEXT NOT NULL DEFAULT '', icon_type TEXT NOT NULL DEFAULT 'svg' CHECK(icon_type IN ('svg', 'image')), icon_alt TEXT, description TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)"
    );
    await env.DB.exec(
      'CREATE INDEX IF NOT EXISTS idx_projects_sort_order ON projects(sort_order ASC)'
    );
    await env.DB.exec(
      "CREATE TABLE IF NOT EXISTS content_pieces (id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE, type TEXT NOT NULL CHECK(type IN ('image', 'iframe')), url TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0)"
    );
    await env.DB.exec(
      'CREATE INDEX IF NOT EXISTS idx_content_pieces_project ON content_pieces(project_id, sort_order ASC)'
    );
  });

  beforeEach(async () => {
    await env.DB.exec('DELETE FROM content_pieces');
    await env.DB.exec('DELETE FROM projects');
  });

  describe('getProject', () => {
    it('should return null for non-existent project', async () => {
      const project = await getProject(env.DB, 'non-existent-id');
      expect(project).toBeNull();
    });

    it('should return project by ID', async () => {
      const created = await createProject(env.DB, {
        title: 'Test Project',
        icon: '<svg></svg>',
        iconType: 'svg',
        description: 'A test project',
        contentPieces: [],
      });

      const retrieved = await getProject(env.DB, created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.title).toBe('Test Project');
      expect(retrieved!.description).toBe('A test project');
    });

    it('should return project with content pieces', async () => {
      const created = await createProject(env.DB, {
        title: 'Project With Content',
        icon: '<svg></svg>',
        iconType: 'svg',
        description: 'Has content',
        contentPieces: [
          { id: '', type: 'image', url: 'https://example.com/1.jpg', description: 'Image 1', order: 0 },
          { id: '', type: 'iframe', url: 'https://example.com', description: 'Iframe', order: 1 },
        ],
      });

      const retrieved = await getProject(env.DB, created.id);
      expect(retrieved!.contentPieces).toHaveLength(2);
      expect(retrieved!.contentPieces[0].type).toBe('image');
      expect(retrieved!.contentPieces[0].url).toBe('https://example.com/1.jpg');
      expect(retrieved!.contentPieces[1].type).toBe('iframe');
    });
  });

  describe('listProjects', () => {
    it('should return empty array when no projects exist', async () => {
      const projects = await listProjects(env.DB);
      expect(projects).toEqual([]);
    });

    it('should return all projects sorted by order (ascending)', async () => {
      await createProject(env.DB, {
        title: 'Project 1',
        icon: '<svg></svg>',
        iconType: 'svg',
        description: 'First',
        contentPieces: [],
      });
      await createProject(env.DB, {
        title: 'Project 2',
        icon: '<svg></svg>',
        iconType: 'svg',
        description: 'Second',
        contentPieces: [],
      });
      await createProject(env.DB, {
        title: 'Project 3',
        icon: '<svg></svg>',
        iconType: 'svg',
        description: 'Third',
        contentPieces: [],
      });

      const projects = await listProjects(env.DB);
      expect(projects).toHaveLength(3);
      expect(projects[0].title).toBe('Project 1');
      expect(projects[0].order).toBe(0);
      expect(projects[1].title).toBe('Project 2');
      expect(projects[1].order).toBe(1);
      expect(projects[2].title).toBe('Project 3');
      expect(projects[2].order).toBe(2);
    });

    it('should include content pieces for each project', async () => {
      await createProject(env.DB, {
        title: 'Project A',
        icon: '<svg></svg>',
        iconType: 'svg',
        description: '',
        contentPieces: [
          { id: '', type: 'image', url: 'https://example.com/a.jpg', description: '', order: 0 },
        ],
      });
      await createProject(env.DB, {
        title: 'Project B',
        icon: '<svg></svg>',
        iconType: 'svg',
        description: '',
        contentPieces: [
          { id: '', type: 'iframe', url: 'https://example.com/b', description: '', order: 0 },
          { id: '', type: 'image', url: 'https://example.com/b.jpg', description: '', order: 1 },
        ],
      });

      const projects = await listProjects(env.DB);
      expect(projects[0].contentPieces).toHaveLength(1);
      expect(projects[1].contentPieces).toHaveLength(2);
    });
  });

  describe('createProject', () => {
    it('should create project with provided data', async () => {
      const project = await createProject(env.DB, {
        title: 'My Project',
        icon: '<svg viewBox="0 0 24 24"></svg>',
        iconType: 'svg',
        description: '**Bold** description',
        contentPieces: [
          { id: '', type: 'image', url: 'https://example.com/img.jpg', description: 'An image', order: 0 },
        ],
      });

      expect(project.id).toBeDefined();
      expect(project.title).toBe('My Project');
      expect(project.icon).toBe('<svg viewBox="0 0 24 24"></svg>');
      expect(project.iconType).toBe('svg');
      expect(project.description).toBe('**Bold** description');
      expect(project.contentPieces).toHaveLength(1);
      expect(project.contentPieces[0].type).toBe('image');
      expect(project.order).toBe(0);
      expect(project.createdAt).toBeDefined();
      expect(project.updatedAt).toBeDefined();
    });

    it('should auto-generate IDs for content pieces', async () => {
      const project = await createProject(env.DB, {
        title: 'Test',
        icon: '<svg></svg>',
        iconType: 'svg',
        description: '',
        contentPieces: [
          { id: '', type: 'image', url: 'https://example.com/1.jpg', description: '', order: 0 },
          { id: '', type: 'iframe', url: 'https://example.com', description: '', order: 1 },
        ],
      });

      expect(project.contentPieces[0].id).toBeDefined();
      expect(project.contentPieces[0].id.length).toBeGreaterThan(0);
      expect(project.contentPieces[1].id).toBeDefined();
      expect(project.contentPieces[1].id.length).toBeGreaterThan(0);
    });

    it('should set order incrementally', async () => {
      const p1 = await createProject(env.DB, {
        title: 'Project 1',
        icon: '<svg></svg>',
        iconType: 'svg',
        description: '',
        contentPieces: [],
      });
      const p2 = await createProject(env.DB, {
        title: 'Project 2',
        icon: '<svg></svg>',
        iconType: 'svg',
        description: '',
        contentPieces: [],
      });

      expect(p1.order).toBe(0);
      expect(p2.order).toBe(1);
    });

    it('should support image iconType', async () => {
      const project = await createProject(env.DB, {
        title: 'Image Icon Project',
        icon: 'https://files.gpeake.com/icons/project.png',
        iconType: 'image',
        description: '',
        contentPieces: [],
      });

      expect(project.iconType).toBe('image');
      expect(project.icon).toBe('https://files.gpeake.com/icons/project.png');
    });
  });

  describe('updateProject', () => {
    it('should return null for non-existent project', async () => {
      const result = await updateProject(env.DB, 'non-existent', {
        title: 'New Title',
      });
      expect(result).toBeNull();
    });

    it('should update title', async () => {
      const created = await createProject(env.DB, {
        title: 'Original Title',
        icon: '<svg></svg>',
        iconType: 'svg',
        description: 'Description',
        contentPieces: [],
      });

      const updated = await updateProject(env.DB, created.id, {
        title: 'Updated Title',
      });

      expect(updated).not.toBeNull();
      expect(updated!.title).toBe('Updated Title');
      expect(updated!.description).toBe('Description'); // unchanged
    });

    it('should update content pieces', async () => {
      const created = await createProject(env.DB, {
        title: 'Test',
        icon: '<svg></svg>',
        iconType: 'svg',
        description: '',
        contentPieces: [
          { id: '', type: 'image', url: 'https://old.com/img.jpg', description: 'Old', order: 0 },
        ],
      });

      const updated = await updateProject(env.DB, created.id, {
        contentPieces: [
          { id: '', type: 'iframe', url: 'https://new.com', description: 'New', order: 0 },
          { id: '', type: 'image', url: 'https://new.com/2.jpg', description: 'Another', order: 1 },
        ],
      });

      expect(updated!.contentPieces).toHaveLength(2);
      expect(updated!.contentPieces[0].type).toBe('iframe');
      expect(updated!.contentPieces[1].type).toBe('image');

      // Verify persisted in DB
      const retrieved = await getProject(env.DB, created.id);
      expect(retrieved!.contentPieces).toHaveLength(2);
    });

    it('should update updatedAt timestamp', async () => {
      const created = await createProject(env.DB, {
        title: 'Test',
        icon: '<svg></svg>',
        iconType: 'svg',
        description: '',
        contentPieces: [],
      });
      const originalUpdatedAt = created.updatedAt;

      await new Promise((r) => setTimeout(r, 10));

      const updated = await updateProject(env.DB, created.id, {
        title: 'New Title',
      });

      expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime()
      );
    });

    it('should update order when provided', async () => {
      const created = await createProject(env.DB, {
        title: 'Test',
        icon: '<svg></svg>',
        iconType: 'svg',
        description: '',
        contentPieces: [],
      });

      const updated = await updateProject(env.DB, created.id, {
        order: 99,
      });

      expect(updated!.order).toBe(99);
    });
  });

  describe('deleteProject', () => {
    it('should return false for non-existent project', async () => {
      const result = await deleteProject(env.DB, 'non-existent');
      expect(result).toBe(false);
    });

    it('should delete project from D1', async () => {
      const created = await createProject(env.DB, {
        title: 'To Delete',
        icon: '<svg></svg>',
        iconType: 'svg',
        description: '',
        contentPieces: [],
      });

      const result = await deleteProject(env.DB, created.id);
      expect(result).toBe(true);

      const retrieved = await getProject(env.DB, created.id);
      expect(retrieved).toBeNull();
    });

    it('should remove project from list', async () => {
      const created = await createProject(env.DB, {
        title: 'To Delete',
        icon: '<svg></svg>',
        iconType: 'svg',
        description: '',
        contentPieces: [],
      });

      await deleteProject(env.DB, created.id);

      const projects = await listProjects(env.DB);
      expect(projects).toHaveLength(0);
    });

    it('should cascade delete content pieces', async () => {
      const created = await createProject(env.DB, {
        title: 'With Content',
        icon: '<svg></svg>',
        iconType: 'svg',
        description: '',
        contentPieces: [
          { id: '', type: 'image', url: 'https://example.com/img.jpg', description: '', order: 0 },
          { id: '', type: 'iframe', url: 'https://example.com', description: '', order: 1 },
        ],
      });

      await deleteProject(env.DB, created.id);

      // Verify content pieces are also deleted
      const { results } = await env.DB.prepare(
        'SELECT * FROM content_pieces WHERE project_id = ?'
      ).bind(created.id).all();
      expect(results).toHaveLength(0);
    });
  });

  describe('reorderProjects', () => {
    it('should reorder projects based on provided ID array', async () => {
      const p1 = await createProject(env.DB, {
        title: 'Project 1',
        icon: '<svg></svg>',
        iconType: 'svg',
        description: '',
        contentPieces: [],
      });
      const p2 = await createProject(env.DB, {
        title: 'Project 2',
        icon: '<svg></svg>',
        iconType: 'svg',
        description: '',
        contentPieces: [],
      });
      const p3 = await createProject(env.DB, {
        title: 'Project 3',
        icon: '<svg></svg>',
        iconType: 'svg',
        description: '',
        contentPieces: [],
      });

      // Reorder: 3, 1, 2
      await reorderProjects(env.DB, [p3.id, p1.id, p2.id]);

      const projects = await listProjects(env.DB);
      expect(projects[0].title).toBe('Project 3');
      expect(projects[0].order).toBe(0);
      expect(projects[1].title).toBe('Project 1');
      expect(projects[1].order).toBe(1);
      expect(projects[2].title).toBe('Project 2');
      expect(projects[2].order).toBe(2);
    });

    it('should return reordered projects', async () => {
      const p1 = await createProject(env.DB, {
        title: 'Project 1',
        icon: '<svg></svg>',
        iconType: 'svg',
        description: '',
        contentPieces: [],
      });
      const p2 = await createProject(env.DB, {
        title: 'Project 2',
        icon: '<svg></svg>',
        iconType: 'svg',
        description: '',
        contentPieces: [],
      });

      const result = await reorderProjects(env.DB, [p2.id, p1.id]);

      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('Project 2');
      expect(result[0].order).toBe(0);
      expect(result[1].title).toBe('Project 1');
      expect(result[1].order).toBe(1);
    });
  });
});
