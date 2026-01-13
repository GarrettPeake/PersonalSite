// Blog Page JavaScript

async function loadPosts() {
  const container = document.getElementById('posts');

  try {
    const response = await fetch('/api/posts');
    if (!response.ok) throw new Error('Failed to fetch posts');

    const posts = await response.json();

    if (posts.length === 0) {
      container.innerHTML = '<p class="empty">No posts yet. Check back soon!</p>';
      return;
    }

    container.innerHTML = posts.map(post => `
      <article class="post-card">
        <h2><a href="/blog/${post.slug}">${escapeHtml(post.title)}</a></h2>
        <p class="post-meta">${formatDate(post.publishedAt)}</p>
        <p class="post-excerpt">${escapeHtml(getExcerpt(post.content))}</p>
      </article>
    `).join('');
  } catch (error) {
    container.innerHTML = '<p class="empty">No posts yet. Check back soon!</p>';
  }
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function getExcerpt(content, maxLength = 200) {
  // Strip markdown and get first paragraph
  const text = content
    .replace(/^#+\s+.+$/gm, '') // Remove headings
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
    .replace(/[*_`]/g, '') // Remove formatting
    .trim();

  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

loadPosts();
