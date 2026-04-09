/**
 * Projects API Handler
 *
 * Handles CRUD operations for home page projects.
 */

import { Env, ProjectCreateInput, ProjectUpdateInput } from '../../types';
import { jsonResponse, corsHeaders, parseJsonBody } from '../../lib/response';
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  reorderProjects,
} from '../../dao/project.dao';

// ============================================================================
// Public Endpoints
// ============================================================================

/** Cache-Control for public GET endpoints */
const PUBLIC_CACHE = 'public, max-age=60, s-maxage=300';

/**
 * GET /api/projects - List all projects (public)
 */
export async function handleListProjectsPublic(env: Env): Promise<Response> {
  try {
    const projects = await listProjects(env.DB);

    // Strip internal IDs from public response
    const publicProjects = projects.map(({ id, ...rest }) => rest);
    return jsonResponse(publicProjects, { ...corsHeaders, 'Cache-Control': PUBLIC_CACHE });
  } catch (error) {
    console.error('Error listing projects:', error);
    return jsonResponse({ error: 'Failed to list projects' }, corsHeaders, 500);
  }
}

// ============================================================================
// Admin Endpoints
// ============================================================================

/**
 * GET /api/admin/projects - List all projects (admin)
 */
export async function handleAdminListProjects(env: Env): Promise<Response> {
  try {
    const projects = await listProjects(env.DB);
    return jsonResponse(projects, corsHeaders);
  } catch (error) {
    console.error('Error listing projects:', error);
    return jsonResponse({ error: 'Failed to list projects' }, corsHeaders, 500);
  }
}

/**
 * GET /api/admin/projects/:id - Get single project
 */
export async function handleAdminGetProject(env: Env, id: string): Promise<Response> {
  try {
    const project = await getProject(env.DB, id);

    if (!project) {
      return jsonResponse({ error: 'Project not found' }, corsHeaders, 404);
    }

    return jsonResponse(project, corsHeaders);
  } catch (error) {
    console.error('Error getting project:', error);
    return jsonResponse({ error: 'Failed to get project' }, corsHeaders, 500);
  }
}

/**
 * POST /api/admin/projects - Create new project
 *
 * Expects JSON body with:
 * - title: string
 * - icon: string (SVG code or image URL)
 * - iconType: 'svg' | 'image'
 * - description: string (markdown)
 * - contentPieces: array of { type, url, description }
 */
export async function handleCreateProject(request: Request, env: Env): Promise<Response> {
  try {
    const body = await parseJsonBody<ProjectCreateInput>(request);
    if (!body) {
      return jsonResponse({ error: 'Invalid JSON body' }, corsHeaders, 400);
    }

    // Validate required fields
    if (!body.title || typeof body.title !== 'string') {
      return jsonResponse({ error: 'title is required' }, corsHeaders, 400);
    }

    if (!body.icon || typeof body.icon !== 'string') {
      return jsonResponse({ error: 'icon is required' }, corsHeaders, 400);
    }

    if (!body.iconType || !['svg', 'image'].includes(body.iconType)) {
      return jsonResponse({ error: 'iconType must be "svg" or "image"' }, corsHeaders, 400);
    }

    if (typeof body.description !== 'string') {
      return jsonResponse({ error: 'description is required' }, corsHeaders, 400);
    }

    if (!Array.isArray(body.contentPieces)) {
      return jsonResponse({ error: 'contentPieces must be an array' }, corsHeaders, 400);
    }

    // Validate content pieces
    for (const piece of body.contentPieces) {
      if (!piece.type || !['image', 'iframe'].includes(piece.type)) {
        return jsonResponse(
          { error: 'Each content piece must have type "image" or "iframe"' },
          corsHeaders,
          400
        );
      }
      if (!piece.url || typeof piece.url !== 'string') {
        return jsonResponse({ error: 'Each content piece must have a url' }, corsHeaders, 400);
      }
    }

    const project = await createProject(env.DB, {
      title: body.title,
      icon: body.icon,
      iconType: body.iconType,
      iconAlt: body.iconAlt || '',
      description: body.description || '',
      contentPieces: body.contentPieces.map((piece) => ({
        id: piece.id || '',
        type: piece.type,
        url: piece.url,
        description: piece.description || '',
        order: piece.order ?? 0,
      })),
    });

    return jsonResponse(project, corsHeaders, 201);
  } catch (error) {
    console.error('Error creating project:', error);
    return jsonResponse({ error: 'Failed to create project' }, corsHeaders, 500);
  }
}

/**
 * PUT /api/admin/projects/:id - Update project
 *
 * Expects JSON body with partial project data
 */
export async function handleUpdateProject(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  try {
    const body = await parseJsonBody<ProjectUpdateInput>(request);
    if (!body) {
      return jsonResponse({ error: 'Invalid JSON body' }, corsHeaders, 400);
    }

    // Validate iconType if provided
    if (body.iconType !== undefined && !['svg', 'image'].includes(body.iconType)) {
      return jsonResponse({ error: 'iconType must be "svg" or "image"' }, corsHeaders, 400);
    }

    // Validate content pieces if provided
    if (body.contentPieces !== undefined) {
      if (!Array.isArray(body.contentPieces)) {
        return jsonResponse({ error: 'contentPieces must be an array' }, corsHeaders, 400);
      }

      for (const piece of body.contentPieces) {
        if (!piece.type || !['image', 'iframe'].includes(piece.type)) {
          return jsonResponse(
            { error: 'Each content piece must have type "image" or "iframe"' },
            corsHeaders,
            400
          );
        }
        if (!piece.url || typeof piece.url !== 'string') {
          return jsonResponse({ error: 'Each content piece must have a url' }, corsHeaders, 400);
        }
      }
    }

    const project = await updateProject(env.DB, id, body);

    if (!project) {
      return jsonResponse({ error: 'Project not found' }, corsHeaders, 404);
    }

    return jsonResponse(project, corsHeaders);
  } catch (error) {
    console.error('Error updating project:', error);
    return jsonResponse({ error: 'Failed to update project' }, corsHeaders, 500);
  }
}

/**
 * DELETE /api/admin/projects/:id - Delete project
 */
export async function handleDeleteProject(env: Env, id: string): Promise<Response> {
  try {
    const deleted = await deleteProject(env.DB, id);

    if (!deleted) {
      return jsonResponse({ error: 'Project not found' }, corsHeaders, 404);
    }

    return jsonResponse({ success: true }, corsHeaders);
  } catch (error) {
    console.error('Error deleting project:', error);
    return jsonResponse({ error: 'Failed to delete project' }, corsHeaders, 500);
  }
}

/**
 * PUT /api/admin/projects/reorder - Reorder projects
 *
 * Expects JSON body with:
 * - ids: string[] (project IDs in desired order)
 */
export async function handleReorderProjects(request: Request, env: Env): Promise<Response> {
  try {
    const body = await parseJsonBody<{ ids?: string[] }>(request);
    if (!body) {
      return jsonResponse({ error: 'Invalid JSON body' }, corsHeaders, 400);
    }

    if (!body.ids || !Array.isArray(body.ids)) {
      return jsonResponse({ error: 'ids array is required' }, corsHeaders, 400);
    }

    // Validate all IDs are strings
    for (const id of body.ids) {
      if (typeof id !== 'string') {
        return jsonResponse({ error: 'All ids must be strings' }, corsHeaders, 400);
      }
    }

    const projects = await reorderProjects(env.DB, body.ids);
    return jsonResponse(projects, corsHeaders);
  } catch (error) {
    console.error('Error reordering projects:', error);
    return jsonResponse({ error: 'Failed to reorder projects' }, corsHeaders, 500);
  }
}
