/**
 * Projects API Handlers Tests
 *
 * Tests for project management endpoints using D1.
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { env } from 'cloudflare:test';
import {
  handleListProjectsPublic,
  handleAdminListProjects,
  handleAdminGetProject,
  handleCreateProject,
  handleUpdateProject,
  handleDeleteProject,
  handleReorderProjects,
} from '../../../handlers/api/projects';
import { createProject, getProject, listProjects } from '../../../dao/project.dao';

describe('Projects API Handlers', () => {
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

  describe('handleListProjectsPublic', () => {
    it('should return empty array when no projects exist', async () => {
      const response = await handleListProjectsPublic(env);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual([]);
    });

    it('should return all projects sorted by order', async () => {
      await createProject(env.DB, {
        title: 'Project 1',
        icon: '<svg></svg>',
        iconType: 'svg',
        description: 'First project',
        contentPieces: [],
      });
      await createProject(env.DB, {
        title: 'Project 2',
        icon: '<svg></svg>',
        iconType: 'svg',
        description: 'Second project',
        contentPieces: [],
      });

      const response = await handleListProjectsPublic(env);

      expect(response.status).toBe(200);
      const data = (await response.json()) as Array<{ title: string; order: number }>;
      expect(data).toHaveLength(2);
      expect(data[0].title).toBe('Project 1');
      expect(data[0].order).toBe(0);
      expect(data[1].title).toBe('Project 2');
      expect(data[1].order).toBe(1);
    });

    it('should include CORS headers', async () => {
      const response = await handleListProjectsPublic(env);
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
    });
  });

  describe('handleAdminListProjects', () => {
    it('should return empty array when no projects exist', async () => {
      const response = await handleAdminListProjects(env);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual([]);
    });

    it('should return all projects with full data', async () => {
      await createProject(env.DB, {
        title: 'Admin Project',
        icon: '<svg></svg>',
        iconType: 'svg',
        description: 'Test',
        contentPieces: [
          { id: '', type: 'image', url: 'https://example.com/img.jpg', description: 'An image', order: 0 },
        ],
      });

      const response = await handleAdminListProjects(env);

      expect(response.status).toBe(200);
      const data = (await response.json()) as Array<{
        title: string;
        contentPieces: Array<{ type: string }>;
        createdAt: string;
        updatedAt: string;
      }>;
      expect(data).toHaveLength(1);
      expect(data[0].title).toBe('Admin Project');
      expect(data[0].contentPieces).toHaveLength(1);
      expect(data[0].createdAt).toBeDefined();
      expect(data[0].updatedAt).toBeDefined();
    });
  });

  describe('handleAdminGetProject', () => {
    it('should return 404 for non-existent project', async () => {
      const response = await handleAdminGetProject(env, 'non-existent');

      expect(response.status).toBe(404);
      const data = (await response.json()) as { error: string };
      expect(data.error).toBe('Project not found');
    });

    it('should return project by ID', async () => {
      const created = await createProject(env.DB, {
        title: 'Test Project',
        icon: '<svg></svg>',
        iconType: 'svg',
        description: 'Description',
        contentPieces: [],
      });

      const response = await handleAdminGetProject(env, created.id);

      expect(response.status).toBe(200);
      const data = (await response.json()) as { id: string; title: string };
      expect(data.id).toBe(created.id);
      expect(data.title).toBe('Test Project');
    });
  });

  describe('handleCreateProject', () => {
    it('should create project with valid data', async () => {
      const request = new Request('http://localhost/api/admin/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Project',
          icon: '<svg viewBox="0 0 24 24"></svg>',
          iconType: 'svg',
          description: '**Bold** description',
          contentPieces: [
            { type: 'image', url: 'https://example.com/img.jpg', description: 'An image' },
          ],
        }),
      });

      const response = await handleCreateProject(request, env);

      expect(response.status).toBe(201);
      const data = (await response.json()) as {
        id: string;
        title: string;
        iconType: string;
        contentPieces: Array<{ id: string; type: string }>;
      };
      expect(data.id).toBeDefined();
      expect(data.title).toBe('New Project');
      expect(data.iconType).toBe('svg');
      expect(data.contentPieces).toHaveLength(1);
      expect(data.contentPieces[0].id).toBeDefined();
    });

    it('should return 400 for missing title', async () => {
      const request = new Request('http://localhost/api/admin/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          icon: '<svg></svg>',
          iconType: 'svg',
          description: '',
          contentPieces: [],
        }),
      });

      const response = await handleCreateProject(request, env);

      expect(response.status).toBe(400);
      const data = (await response.json()) as { error: string };
      expect(data.error).toContain('title');
    });

    it('should return 400 for invalid iconType', async () => {
      const request = new Request('http://localhost/api/admin/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test',
          icon: '<svg></svg>',
          iconType: 'invalid',
          description: '',
          contentPieces: [],
        }),
      });

      const response = await handleCreateProject(request, env);

      expect(response.status).toBe(400);
      const data = (await response.json()) as { error: string };
      expect(data.error).toContain('iconType');
    });

    it('should return 400 for invalid content piece type', async () => {
      const request = new Request('http://localhost/api/admin/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test',
          icon: '<svg></svg>',
          iconType: 'svg',
          description: '',
          contentPieces: [{ type: 'invalid', url: 'https://example.com', description: '' }],
        }),
      });

      const response = await handleCreateProject(request, env);

      expect(response.status).toBe(400);
      const data = (await response.json()) as { error: string };
      expect(data.error).toContain('type');
    });

    it('should create project with image icon', async () => {
      const request = new Request('http://localhost/api/admin/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Image Icon Project',
          icon: 'https://files.gpeake.com/icons/project.png',
          iconType: 'image',
          description: '',
          contentPieces: [],
        }),
      });

      const response = await handleCreateProject(request, env);

      expect(response.status).toBe(201);
      const data = (await response.json()) as { iconType: string; icon: string };
      expect(data.iconType).toBe('image');
      expect(data.icon).toBe('https://files.gpeake.com/icons/project.png');
    });
  });

  describe('handleUpdateProject', () => {
    it('should return 404 for non-existent project', async () => {
      const request = new Request('http://localhost/api/admin/projects/non-existent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Title' }),
      });

      const response = await handleUpdateProject(request, env, 'non-existent');

      expect(response.status).toBe(404);
    });

    it('should update project title', async () => {
      const created = await createProject(env.DB, {
        title: 'Original Title',
        icon: '<svg></svg>',
        iconType: 'svg',
        description: 'Description',
        contentPieces: [],
      });

      const request = new Request(`http://localhost/api/admin/projects/${created.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Title' }),
      });

      const response = await handleUpdateProject(request, env, created.id);

      expect(response.status).toBe(200);
      const data = (await response.json()) as { title: string; description: string };
      expect(data.title).toBe('Updated Title');
      expect(data.description).toBe('Description'); // unchanged
    });

    it('should update content pieces', async () => {
      const created = await createProject(env.DB, {
        title: 'Test',
        icon: '<svg></svg>',
        iconType: 'svg',
        description: '',
        contentPieces: [],
      });

      const request = new Request(`http://localhost/api/admin/projects/${created.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentPieces: [
            { type: 'iframe', url: 'https://example.com', description: 'A website' },
          ],
        }),
      });

      const response = await handleUpdateProject(request, env, created.id);

      expect(response.status).toBe(200);
      const data = (await response.json()) as { contentPieces: Array<{ type: string; id: string }> };
      expect(data.contentPieces).toHaveLength(1);
      expect(data.contentPieces[0].type).toBe('iframe');
      expect(data.contentPieces[0].id).toBeDefined();
    });

    it('should return 400 for invalid iconType', async () => {
      const created = await createProject(env.DB, {
        title: 'Test',
        icon: '<svg></svg>',
        iconType: 'svg',
        description: '',
        contentPieces: [],
      });

      const request = new Request(`http://localhost/api/admin/projects/${created.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ iconType: 'invalid' }),
      });

      const response = await handleUpdateProject(request, env, created.id);

      expect(response.status).toBe(400);
    });
  });

  describe('handleDeleteProject', () => {
    it('should return 404 for non-existent project', async () => {
      const response = await handleDeleteProject(env, 'non-existent');

      expect(response.status).toBe(404);
    });

    it('should delete project', async () => {
      const created = await createProject(env.DB, {
        title: 'To Delete',
        icon: '<svg></svg>',
        iconType: 'svg',
        description: '',
        contentPieces: [],
      });

      const response = await handleDeleteProject(env, created.id);

      expect(response.status).toBe(200);
      const data = (await response.json()) as { success: boolean };
      expect(data.success).toBe(true);

      const deleted = await getProject(env.DB, created.id);
      expect(deleted).toBeNull();
    });

    it('should remove project from list', async () => {
      const created = await createProject(env.DB, {
        title: 'To Delete',
        icon: '<svg></svg>',
        iconType: 'svg',
        description: '',
        contentPieces: [],
      });

      await handleDeleteProject(env, created.id);

      const projects = await listProjects(env.DB);
      expect(projects).toHaveLength(0);
    });
  });

  describe('handleReorderProjects', () => {
    it('should return 400 for missing ids array', async () => {
      const request = new Request('http://localhost/api/admin/projects/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await handleReorderProjects(request, env);

      expect(response.status).toBe(400);
      const data = (await response.json()) as { error: string };
      expect(data.error).toContain('ids');
    });

    it('should reorder projects', async () => {
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
      const request = new Request('http://localhost/api/admin/projects/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [p3.id, p1.id, p2.id] }),
      });

      const response = await handleReorderProjects(request, env);

      expect(response.status).toBe(200);

      // Verify order
      const projects = await listProjects(env.DB);
      expect(projects[0].title).toBe('Project 3');
      expect(projects[1].title).toBe('Project 1');
      expect(projects[2].title).toBe('Project 2');
    });

    it('should return 400 for non-string ids', async () => {
      const request = new Request('http://localhost/api/admin/projects/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [123, 456] }),
      });

      const response = await handleReorderProjects(request, env);

      expect(response.status).toBe(400);
    });
  });
});
