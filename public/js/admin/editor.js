// Admin Editor Page JavaScript

// State
let currentId = null;
let isDraft = true;
let isLoading = false;
let hasUnsavedChanges = false;
let autoSaveTimer = null;

// Elements
const titleInput = document.getElementById('title');
const slugInput = document.getElementById('slug');
const descriptionInput = document.getElementById('description');
const contentInput = document.getElementById('content');
const previewEl = document.getElementById('preview');
const saveStatus = document.getElementById('save-status');
const saveBtn = document.getElementById('save-btn');
const publishBtn = document.getElementById('publish-btn');
const previewBtn = document.getElementById('preview-btn');

// Initialize
async function init() {
  // Check for edit mode from URL
  const params = new URLSearchParams(window.location.search);
  const draftId = params.get('draft');
  const postId = params.get('post');

  if (draftId) {
    await loadDraft(draftId);
  } else if (postId) {
    await loadPost(postId);
  }

  // Set up event listeners
  titleInput.addEventListener('input', handleTitleChange);
  slugInput.addEventListener('input', handleChange);
  descriptionInput.addEventListener('input', handleChange);
  contentInput.addEventListener('input', handleContentChange);

  // Toolbar buttons
  document.querySelectorAll('.toolbar button').forEach(btn => {
    btn.addEventListener('click', () => handleToolbarAction(btn.dataset.action));
  });

  // Action buttons
  saveBtn.addEventListener('click', handleSave);
  publishBtn.addEventListener('click', handlePublish);
  previewBtn.addEventListener('click', handlePreview);

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboard);

  // Drag and drop file upload
  contentInput.addEventListener('dragover', (e) => {
    e.preventDefault();
    contentInput.classList.add('drag-over');
  });
  contentInput.addEventListener('dragleave', () => {
    contentInput.classList.remove('drag-over');
  });
  contentInput.addEventListener('drop', (e) => {
    e.preventDefault();
    contentInput.classList.remove('drag-over');
    const files = e.dataTransfer?.files;
    if (files) handleFileUpload(files);
  });

  // Paste file upload
  contentInput.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files = [];
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      handleFileUpload(files);
    }
  });

  // Warn on unsaved changes
  window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // Initial preview
  updatePreview();
}

// Load draft for editing
async function loadDraft(id) {
  try {
    const res = await fetch(`/api/admin/drafts/${id}`);
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      throw new Error('Failed to load draft');
    }
    const draft = await res.json();
    currentId = draft.id;
    isDraft = true;
    titleInput.value = draft.title || '';
    slugInput.value = draft.slug || '';
    descriptionInput.value = draft.description || '';
    contentInput.value = draft.content || '';
    updatePreview();
    publishBtn.textContent = 'Publish';
    saveBtn.style.display = '';
  } catch (err) {
    console.error('Failed to load draft:', err);
    saveStatus.textContent = 'Failed to load';
  }
}

// Load post for editing
async function loadPost(id) {
  try {
    const res = await fetch(`/api/admin/posts/${id}`);
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      throw new Error('Failed to load post');
    }
    const post = await res.json();
    currentId = post.id;
    isDraft = false;
    titleInput.value = post.title || '';
    slugInput.value = post.slug || '';
    descriptionInput.value = post.description || '';
    contentInput.value = post.content || '';
    updatePreview();
    publishBtn.textContent = 'Update';
    saveBtn.style.display = 'none';
  } catch (err) {
    console.error('Failed to load post:', err);
    saveStatus.textContent = 'Failed to load';
  }
}

// Handle title change - auto-generate slug and update preview
function handleTitleChange() {
  handleChange();
  if (!currentId && !slugInput.value) {
    slugInput.value = slugify(titleInput.value);
  }
  updatePreview();
}

// Handle any input change
function handleChange() {
  hasUnsavedChanges = true;
  saveStatus.textContent = 'Unsaved changes';

  // Auto-save after 3 seconds of inactivity
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => autoSave(), 3000);
}

// Handle content change
function handleContentChange() {
  handleChange();
  updatePreview();
}

// Update preview pane
function updatePreview() {
  const title = titleInput.value.trim();
  const content = contentInput.value;
  const titleHtml = title ? `<h2>${escapePreviewHtml(title)}</h2>` : '';
  const bodyHtml = window.renderMarkdown(content);
  previewEl.innerHTML = titleHtml + (bodyHtml || '<p style="color: var(--color-text); opacity: 0.5;">Preview will appear here...</p>');
}

function escapePreviewHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Auto-save (works for drafts and published posts)
async function autoSave() {
  if (isLoading) return;

  const data = {
    title: titleInput.value,
    slug: slugInput.value,
    description: descriptionInput.value,
    content: contentInput.value,
  };

  isLoading = true;
  saveStatus.textContent = 'Saving...';

  try {
    let res;
    if (!currentId) {
      // Create new draft
      res = await fetch('/api/admin/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const result = await res.json();
        currentId = result.id;
        isDraft = true;
        const url = new URL(window.location);
        url.searchParams.set('draft', currentId);
        window.history.replaceState({}, '', url);
      }
    } else if (isDraft) {
      res = await fetch(`/api/admin/drafts/${currentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } else {
      // Published post
      res = await fetch(`/api/admin/posts/${currentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    }

    if (res && res.ok) {
      hasUnsavedChanges = false;
      saveStatus.textContent = 'Saved';
    } else {
      saveStatus.textContent = 'Save failed';
    }
  } catch (err) {
    saveStatus.textContent = 'Save failed';
  } finally {
    isLoading = false;
  }
}

// Handle file upload (drag/drop or paste)
async function handleFileUpload(files) {
  for (const file of files) {
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');
    if (!isImage && !isVideo) continue;

    saveStatus.textContent = 'Uploading...';

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        saveStatus.textContent = err.error || 'Upload failed';
        continue;
      }

      const { url } = await res.json();
      const textarea = contentInput;
      const pos = textarea.selectionStart;

      let markdown;
      if (isVideo) {
        markdown = `\n/Iframe("${url}")\n`;
      } else {
        const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
        markdown = `\n![${name}](${url})\n`;
      }

      textarea.value = textarea.value.substring(0, pos) + markdown + textarea.value.substring(pos);
      textarea.selectionStart = textarea.selectionEnd = pos + markdown.length;
      handleContentChange();
      saveStatus.textContent = 'Uploaded';
    } catch (err) {
      saveStatus.textContent = 'Upload failed';
    }
  }
}

// Handle save button
async function handleSave() {
  if (isLoading) return;

  isLoading = true;
  saveStatus.textContent = 'Saving...';

  try {
    const data = {
      title: titleInput.value,
      slug: slugInput.value,
      description: descriptionInput.value,
      content: contentInput.value,
    };

    let res;
    if (currentId && isDraft) {
      res = await fetch(`/api/admin/drafts/${currentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } else {
      res = await fetch('/api/admin/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    }

    if (res.ok) {
      const result = await res.json();
      currentId = result.id;
      isDraft = true;
      hasUnsavedChanges = false;
      saveStatus.textContent = 'Saved';

      // Update URL without reload
      const url = new URL(window.location);
      url.searchParams.set('draft', currentId);
      url.searchParams.delete('post');
      window.history.replaceState({}, '', url);
    } else {
      const err = await res.json();
      saveStatus.textContent = err.error || 'Save failed';
    }
  } catch (err) {
    saveStatus.textContent = 'Save failed';
  } finally {
    isLoading = false;
  }
}

// Handle publish button
async function handlePublish() {
  if (isLoading) return;

  if (!titleInput.value.trim()) {
    saveStatus.textContent = 'Title required';
    return;
  }

  if (!slugInput.value.trim()) {
    saveStatus.textContent = 'Slug required';
    return;
  }

  isLoading = true;
  saveStatus.textContent = isDraft ? 'Publishing...' : 'Updating...';

  try {
    if (isDraft) {
      // First save the draft if needed
      if (!currentId) {
        const createRes = await fetch('/api/admin/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: titleInput.value,
            slug: slugInput.value,
            description: descriptionInput.value,
            content: contentInput.value,
          }),
        });
        if (!createRes.ok) throw new Error('Failed to create draft');
        const draft = await createRes.json();
        currentId = draft.id;
      } else {
        // Update draft first
        await fetch(`/api/admin/drafts/${currentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: titleInput.value,
            slug: slugInput.value,
            description: descriptionInput.value,
            content: contentInput.value,
          }),
        });
      }

      // Then publish
      const res = await fetch(`/api/admin/drafts/${currentId}/publish`, {
        method: 'POST',
      });

      if (res.ok) {
        const post = await res.json();
        hasUnsavedChanges = false;
        saveStatus.textContent = 'Published!';

        // Redirect to posts page
        setTimeout(() => {
          window.location.href = '/admin/posts';
        }, 1000);
      } else {
        const err = await res.json();
        saveStatus.textContent = err.error || 'Publish failed';
      }
    } else {
      // Update published post
      const res = await fetch(`/api/admin/posts/${currentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: titleInput.value,
          slug: slugInput.value,
          description: descriptionInput.value,
          content: contentInput.value,
        }),
      });

      if (res.ok) {
        hasUnsavedChanges = false;
        saveStatus.textContent = 'Updated!';
      } else {
        const err = await res.json();
        saveStatus.textContent = err.error || 'Update failed';
      }
    }
  } catch (err) {
    saveStatus.textContent = isDraft ? 'Publish failed' : 'Update failed';
  } finally {
    isLoading = false;
  }
}

// Handle preview button
function handlePreview() {
  const slug = slugInput.value || 'preview';
  window.open(`/blog/${slug}`, '_blank');
}

// Handle toolbar actions
function handleToolbarAction(action) {
  const textarea = contentInput;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.substring(start, end);

  let insert = '';
  let cursorOffset = 0;

  switch (action) {
    case 'bold':
      insert = `**${selected || 'bold text'}**`;
      cursorOffset = selected ? insert.length : 2;
      break;
    case 'italic':
      insert = `*${selected || 'italic text'}*`;
      cursorOffset = selected ? insert.length : 1;
      break;
    case 'code':
      insert = `\`${selected || 'code'}\``;
      cursorOffset = selected ? insert.length : 1;
      break;
    case 'h2':
      insert = `\n## ${selected || 'Heading'}`;
      cursorOffset = insert.length;
      break;
    case 'h3':
      insert = `\n### ${selected || 'Heading'}`;
      cursorOffset = insert.length;
      break;
    case 'link':
      insert = `[${selected || 'link text'}](url)`;
      cursorOffset = selected ? insert.length - 1 : 1;
      break;
    case 'image':
      insert = `![${selected || 'alt text'}](image-url)`;
      cursorOffset = selected ? insert.length - 1 : 2;
      break;
    case 'ul':
      insert = `\n- ${selected || 'List item'}`;
      cursorOffset = insert.length;
      break;
    case 'quote':
      insert = `\n> ${selected || 'Quote'}`;
      cursorOffset = insert.length;
      break;
    case 'codeblock':
      insert = `\n\`\`\`\n${selected || 'code here'}\n\`\`\``;
      cursorOffset = selected ? insert.length : 5;
      break;
    case 'banner':
      insert = `\n/Banner(200px, "Title", "Subtitle", "")\n`;
      cursorOffset = 18;
      break;
    case 'callout':
      insert = `\n/Callout("Your note here")\n`;
      cursorOffset = 12;
      break;
    case 'twocolumn':
      insert = `\n/TwoColumn\nLeft column content\n///\nRight column content\n/End\n`;
      cursorOffset = 13;
      break;
    case 'linkpreview':
      handleLinkPreviewInsert();
      return;
    case 'iframe':
      insert = `\n/Iframe("https://example.com")\n`;
      cursorOffset = 10;
      break;
    case 'htmlsnippet':
      handleHtmlSnippetUpload();
      return;
  }

  textarea.value = textarea.value.substring(0, start) + insert + textarea.value.substring(end);
  textarea.focus();
  textarea.selectionStart = textarea.selectionEnd = start + cursorOffset;

  handleContentChange();
}

// Handle link preview insertion with OG fetch
async function handleLinkPreviewInsert() {
  const url = prompt('Enter URL for link preview:');
  if (!url) return;

  saveStatus.textContent = 'Fetching link data...';

  try {
    const res = await fetch(`/api/admin/og?url=${encodeURIComponent(url)}`);
    const og = await res.json();

    const title = (og.title || '').replace(/"/g, '\\"');
    const description = (og.description || '').replace(/"/g, '\\"');
    const image = og.image || '';

    const macro = `\n/LinkPreview("${url}", "${title}", "${description}", "${image}")\n`;

    const textarea = contentInput;
    const pos = textarea.selectionStart;
    textarea.value = textarea.value.substring(0, pos) + macro + textarea.value.substring(pos);
    textarea.selectionStart = textarea.selectionEnd = pos + macro.length;
    handleContentChange();
    saveStatus.textContent = '';
  } catch {
    // Fall back to manual entry
    const macro = `\n/LinkPreview("${url}", "", "", "")\n`;
    const textarea = contentInput;
    const pos = textarea.selectionStart;
    textarea.value = textarea.value.substring(0, pos) + macro + textarea.value.substring(pos);
    textarea.selectionStart = textarea.selectionEnd = pos + macro.length;
    handleContentChange();
    saveStatus.textContent = 'Could not fetch link data';
  }
}

// Handle HTML snippet upload toolbar action
function handleHtmlSnippetUpload() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.html,.htm';
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;

    saveStatus.textContent = 'Uploading HTML...';

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        saveStatus.textContent = err.error || 'Upload failed';
        return;
      }

      const { url } = await res.json();
      const macro = `\n/Iframe("${url}")\n`;

      const textarea = contentInput;
      const pos = textarea.selectionStart;
      textarea.value = textarea.value.substring(0, pos) + macro + textarea.value.substring(pos);
      textarea.selectionStart = textarea.selectionEnd = pos + macro.length;
      handleContentChange();
      saveStatus.textContent = 'HTML snippet uploaded';
    } catch {
      saveStatus.textContent = 'Upload failed';
    }
  });
  input.click();
}

// Keyboard shortcuts
function handleKeyboard(e) {
  if (e.ctrlKey || e.metaKey) {
    switch (e.key) {
      case 's':
        e.preventDefault();
        handleSave();
        break;
      case 'b':
        e.preventDefault();
        handleToolbarAction('bold');
        break;
      case 'i':
        e.preventDefault();
        handleToolbarAction('italic');
        break;
    }
  }
}

// Generate slug from title
function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Logout handler
document.getElementById('logout-btn').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/admin/login';
});

// Initialize on load
init();
