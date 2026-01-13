/**
 * Draft Preview Page Handler
 *
 * Handles /draft/share/:token routes for previewing unpublished drafts.
 */

import { Env } from '../../types';
import { getDraftByShareToken } from '../../dao/draft.dao';
import { renderMarkdown } from '../../lib/markdown';
import { renderPostPage } from '../../templates/post';
import { htmlResponse } from '../../lib/response';

/**
 * Handle draft preview page requests
 */
export async function handleDraftPreview(
  _request: Request,
  env: Env,
  path: string
): Promise<Response> {
  // Extract token from /draft/share/:token
  const match = path.match(/^\/draft\/share\/([^/]+)/);
  if (!match) {
    return new Response('Not found', { status: 404 });
  }

  const token = match[1];
  const draft = await getDraftByShareToken(env.KV, token);

  if (!draft) {
    return htmlResponse(
      renderPostPage({
        title: 'Draft Not Found',
        content: '<p>This draft link is invalid or has expired.</p>',
        publishedAt: '',
        notFound: true,
        isDraft: true,
      }),
      404
    );
  }

  const renderedContent = renderMarkdown(draft.content);

  return htmlResponse(
    renderPostPage({
      title: draft.title,
      content: renderedContent,
      publishedAt: draft.updatedAt,
      isDraft: true,
    })
  );
}
