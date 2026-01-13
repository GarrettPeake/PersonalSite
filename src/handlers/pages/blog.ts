/**
 * Blog Post Page Handler
 *
 * Handles /blog/:slug routes for rendering published blog posts.
 */

import { Env } from '../../types';
import { getPostBySlug } from '../../dao/post.dao';
import { renderMarkdown } from '../../lib/markdown';
import { renderPostPage } from '../../templates/post';
import { htmlResponse } from '../../lib/response';

/**
 * Handle blog post page requests
 */
export async function handleBlogPost(
  request: Request,
  env: Env,
  path: string
): Promise<Response> {
  const slug = path.replace('/blog/', '');

  if (!slug) {
    return env.ASSETS.fetch(request);
  }

  const post = await getPostBySlug(env.KV, slug);

  if (!post) {
    return htmlResponse(
      renderPostPage({
        title: 'Post Not Found',
        content: '<p>The post you\'re looking for doesn\'t exist.</p>',
        publishedAt: '',
        notFound: true,
      }),
      404
    );
  }

  const renderedContent = renderMarkdown(post.content);

  return htmlResponse(
    renderPostPage({
      title: post.title,
      content: renderedContent,
      publishedAt: post.publishedAt,
    })
  );
}
