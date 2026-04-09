/**
 * Project Data Access Object
 *
 * Manages projects displayed on the home page using D1.
 */

import { queryOne, queryAll } from './base';
import { Project, ProjectCreateInput, ProjectUpdateInput, ContentPiece } from '../types';

const PROJECT_COLUMNS = 'id, title, icon, icon_type as iconType, icon_alt as iconAlt, description, sort_order as "order", created_at as createdAt, updated_at as updatedAt';
const CONTENT_PIECE_COLUMNS = 'id, type, url, description, sort_order as "order"';

// ============================================================================
// Internal helpers
// ============================================================================

interface ContentPieceRow {
  id: string;
  type: 'image' | 'iframe';
  url: string;
  description: string;
  order: number;
  project_id: string;
}

/**
 * Fetch content pieces for a single project
 */
async function getContentPieces(db: D1Database, projectId: string): Promise<ContentPiece[]> {
  return queryAll<ContentPiece>(
    db,
    `SELECT ${CONTENT_PIECE_COLUMNS} FROM content_pieces WHERE project_id = ? ORDER BY sort_order ASC`,
    [projectId]
  );
}

/**
 * Fetch all content pieces grouped by project_id
 */
async function getAllContentPieces(db: D1Database): Promise<Map<string, ContentPiece[]>> {
  const rows = await queryAll<ContentPieceRow>(
    db,
    `SELECT id, project_id, type, url, description, sort_order as "order" FROM content_pieces ORDER BY project_id, sort_order ASC`
  );
  const map = new Map<string, ContentPiece[]>();
  for (const row of rows) {
    const projectId = row.project_id;
    if (!map.has(projectId)) {
      map.set(projectId, []);
    }
    map.get(projectId)!.push({
      id: row.id,
      type: row.type,
      url: row.url,
      description: row.description,
      order: row.order,
    });
  }
  return map;
}

// ============================================================================
// Project CRUD Operations
// ============================================================================

/**
 * Get a project by ID
 */
export async function getProject(db: D1Database, id: string): Promise<Project | null> {
  const row = await queryOne<Omit<Project, 'contentPieces'>>(
    db,
    `SELECT ${PROJECT_COLUMNS} FROM projects WHERE id = ?`,
    [id]
  );
  if (!row) return null;

  const contentPieces = await getContentPieces(db, id);
  return { ...row, contentPieces };
}

/**
 * List all projects sorted by order (ascending)
 */
export async function listProjects(db: D1Database): Promise<Project[]> {
  const rows = await queryAll<Omit<Project, 'contentPieces'>>(
    db,
    `SELECT ${PROJECT_COLUMNS} FROM projects ORDER BY sort_order ASC`
  );

  const contentMap = await getAllContentPieces(db);

  return rows.map((row) => ({
    ...row,
    contentPieces: contentMap.get(row.id) || [],
  }));
}

/**
 * Create a new project
 */
export async function createProject(
  db: D1Database,
  data: ProjectCreateInput
): Promise<Project> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // Calculate next sort_order
  const maxRow = await queryOne<{ maxOrder: number | null }>(
    db,
    'SELECT MAX(sort_order) as maxOrder FROM projects'
  );
  const order = (maxRow?.maxOrder ?? -1) + 1;

  // Normalize content pieces with IDs and order
  const contentPieces: ContentPiece[] = data.contentPieces.map((piece, index) => ({
    ...piece,
    id: piece.id || crypto.randomUUID(),
    order: piece.order ?? index,
  }));

  // Build batch statements
  const statements: D1PreparedStatement[] = [
    db.prepare(
      'INSERT INTO projects (id, title, icon, icon_type, icon_alt, description, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, data.title, data.icon, data.iconType, data.iconAlt ?? null, data.description, order, now, now),
  ];

  for (const piece of contentPieces) {
    statements.push(
      db.prepare(
        'INSERT INTO content_pieces (id, project_id, type, url, description, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(piece.id, id, piece.type, piece.url, piece.description, piece.order)
    );
  }

  await db.batch(statements);

  return {
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
}

/**
 * Update a project
 */
export async function updateProject(
  db: D1Database,
  id: string,
  data: ProjectUpdateInput
): Promise<Project | null> {
  const existing = await getProject(db, id);
  if (!existing) return null;

  const now = new Date().toISOString();

  // Normalize content pieces if provided
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
    updatedAt: now,
  };

  // Build batch statements
  const statements: D1PreparedStatement[] = [
    db.prepare(
      'UPDATE projects SET title = ?, icon = ?, icon_type = ?, icon_alt = ?, description = ?, sort_order = ?, updated_at = ? WHERE id = ?'
    ).bind(updated.title, updated.icon, updated.iconType, updated.iconAlt ?? null, updated.description, updated.order, now, id),
  ];

  // Replace content pieces if provided
  if (data.contentPieces !== undefined) {
    statements.push(
      db.prepare('DELETE FROM content_pieces WHERE project_id = ?').bind(id)
    );
    for (const piece of contentPieces) {
      statements.push(
        db.prepare(
          'INSERT INTO content_pieces (id, project_id, type, url, description, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(piece.id, id, piece.type, piece.url, piece.description, piece.order)
      );
    }
  }

  await db.batch(statements);

  return updated;
}

/**
 * Delete a project
 *
 * CASCADE on content_pieces handles child row cleanup.
 */
export async function deleteProject(db: D1Database, id: string): Promise<boolean> {
  const existing = await getProject(db, id);
  if (!existing) return false;

  await db.prepare('DELETE FROM projects WHERE id = ?').bind(id).run();
  return true;
}

/**
 * Reorder projects by providing an array of IDs in the desired order
 */
export async function reorderProjects(
  db: D1Database,
  orderedIds: string[]
): Promise<Project[]> {
  const now = new Date().toISOString();

  // Build batch of UPDATE statements for each valid ID
  const statements: D1PreparedStatement[] = [];
  for (let i = 0; i < orderedIds.length; i++) {
    statements.push(
      db.prepare('UPDATE projects SET sort_order = ?, updated_at = ? WHERE id = ?')
        .bind(i, now, orderedIds[i])
    );
  }

  if (statements.length > 0) {
    await db.batch(statements);
  }

  return listProjects(db);
}
