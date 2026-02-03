// Admin About Page Editor

// State
let isLoading = false;
let hasUnsavedChanges = false;
let autoSaveTimer = null;

// Elements
const contentInput = document.getElementById('content');
const previewEl = document.getElementById('preview');
const saveStatus = document.getElementById('save-status');
const saveBtn = document.getElementById('save-btn');

// Initialize
async function init() {
  // Load existing content
  await loadContent();

  // Set up event listeners
  contentInput.addEventListener('input', handleContentChange);

  // Toolbar buttons
  document.querySelectorAll('.toolbar button').forEach(btn => {
    btn.addEventListener('click', () => handleToolbarAction(btn.dataset.action));
  });

  // Action buttons
  saveBtn.addEventListener('click', handleSave);

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

// Load about page content
async function loadContent() {
  try {
    const res = await fetch('/api/admin/about');
    if (!res.ok) {
      if (res.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      throw new Error('Failed to load content');
    }
    const data = await res.json();
    contentInput.value = data.content || '';
    updatePreview();
  } catch (err) {
    console.error('Failed to load about page content:', err);
    saveStatus.textContent = 'Failed to load';
  }
}

// Handle content change
function handleContentChange() {
  hasUnsavedChanges = true;
  saveStatus.textContent = 'Unsaved changes';
  updatePreview();

  // Auto-save after 3 seconds of inactivity
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => autoSave(), 3000);
}

// Update preview pane
function updatePreview() {
  const content = contentInput.value;
  const bodyHtml = window.renderMarkdown(content);
  previewEl.innerHTML = bodyHtml || '<p style="color: var(--color-text); opacity: 0.5;">Preview will appear here...</p>';
}

// Auto-save
async function autoSave() {
  if (isLoading) return;

  isLoading = true;
  saveStatus.textContent = 'Saving...';

  try {
    const res = await fetch('/api/admin/about', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: contentInput.value }),
    });

    if (res.ok) {
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
    const res = await fetch('/api/admin/about', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: contentInput.value }),
    });

    if (res.ok) {
      hasUnsavedChanges = false;
      saveStatus.textContent = 'Saved';
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

// Logout handler
document.getElementById('logout-btn').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/admin/login';
});

// Initialize on load
init();
