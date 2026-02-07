/**
 * Project Data Access Object
 *
 * Manages projects displayed on the home page.
 */

import { KV_PREFIX, Project, ProjectCreateInput, ProjectUpdateInput } from '../types';
import { getIndex, addToIndex, removeFromIndex } from './base';

// ============================================================================
// Project CRUD Operations
// ============================================================================

/**
 * Get a project by ID
 */
export async function getProject(kv: KVNamespace, id: string): Promise<Project | null> {
  const data = await kv.get(`${KV_PREFIX.PROJECT}${id}`);
  if (!data) return null;
  return JSON.parse(data);
}

/**
 * List all projects sorted by order (ascending)
 */
export async function listProjects(kv: KVNamespace): Promise<Project[]> {
  const ids = await getIndex(kv, KV_PREFIX.INDEX_PROJECTS);
  const results = await Promise.all(ids.map(id => getProject(kv, id)));
  const projects = results.filter((project): project is Project => project !== null);

  // Sort by order ascending
  projects.sort((a, b) => a.order - b.order);

  return projects;
}

/**
 * Get the next available order value
 */
async function getNextOrder(kv: KVNamespace): Promise<number> {
  const projects = await listProjects(kv);
  if (projects.length === 0) return 0;
  return Math.max(...projects.map((p) => p.order)) + 1;
}

/**
 * Create a new project
 */
export async function createProject(
  kv: KVNamespace,
  data: ProjectCreateInput
): Promise<Project> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const order = await getNextOrder(kv);

  // Ensure content pieces have IDs and order
  const contentPieces = data.contentPieces.map((piece, index) => ({
    ...piece,
    id: piece.id || crypto.randomUUID(),
    order: piece.order ?? index,
  }));

  const project: Project = {
    id,
    title: data.title,
    icon: data.icon,
    iconType: data.iconType,
    iconAlt: data.iconAlt,
    description: data.description,
    contentPieces,
    order,
    createdAt: now,
    updatedAt: now,
  };

  await kv.put(`${KV_PREFIX.PROJECT}${id}`, JSON.stringify(project));
  await addToIndex(kv, KV_PREFIX.INDEX_PROJECTS, id);

  return project;
}

/**
 * Update a project
 */
export async function updateProject(
  kv: KVNamespace,
  id: string,
  data: ProjectUpdateInput
): Promise<Project | null> {
  const existing = await getProject(kv, id);
  if (!existing) return null;

  // If content pieces are being updated, ensure they have IDs and order
  let contentPieces = existing.contentPieces;
  if (data.contentPieces !== undefined) {
    contentPieces = data.contentPieces.map((piece, index) => ({
      ...piece,
      id: piece.id || crypto.randomUUID(),
      order: piece.order ?? index,
    }));
  }

  const updated: Project = {
    ...existing,
    title: data.title ?? existing.title,
    icon: data.icon ?? existing.icon,
    iconType: data.iconType ?? existing.iconType,
    iconAlt: data.iconAlt !== undefined ? data.iconAlt : existing.iconAlt,
    description: data.description ?? existing.description,
    contentPieces,
    order: data.order ?? existing.order,
    updatedAt: new Date().toISOString(),
  };

  await kv.put(`${KV_PREFIX.PROJECT}${id}`, JSON.stringify(updated));
  return updated;
}

/**
 * Delete a project
 */
export async function deleteProject(kv: KVNamespace, id: string): Promise<boolean> {
  const project = await getProject(kv, id);
  if (!project) return false;

  await kv.delete(`${KV_PREFIX.PROJECT}${id}`);
  await removeFromIndex(kv, KV_PREFIX.INDEX_PROJECTS, id);

  return true;
}

/**
 * Reorder projects by providing an array of IDs in the desired order
 */
export async function reorderProjects(
  kv: KVNamespace,
  orderedIds: string[]
): Promise<Project[]> {
  const projects: Project[] = [];

  for (let i = 0; i < orderedIds.length; i++) {
    const id = orderedIds[i];
    const project = await getProject(kv, id);
    if (!project) continue;

    const updated: Project = {
      ...project,
      order: i,
      updatedAt: new Date().toISOString(),
    };

    await kv.put(`${KV_PREFIX.PROJECT}${id}`, JSON.stringify(updated));
    projects.push(updated);
  }

  return projects;
}
