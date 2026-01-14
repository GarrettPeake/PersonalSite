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
        ${post.description ? `<p class="post-excerpt">${escapeHtml(post.description)}</p>` : ''}
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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

loadPosts();
