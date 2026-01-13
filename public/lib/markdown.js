/**
 * Client-side Markdown Renderer with Macro Support
 *
 * Mirrors the server-side renderer for consistent preview
 *
 * Supports:
 * - Basic markdown: headings, paragraphs, lists, links, code, bold, italic
 * - Macro syntax: /MacroName(args) for block, /macroName(args) for inline
 * - MVP: Only /Banner macro implemented
 */

// ============================================================================
// Macro Registry
// ============================================================================

const macros = {
  block: {
    Banner: renderBannerMacro,
  },
  inline: {
    // Future inline macros will go here
  },
};

/**
 * Render /Banner(height, text, subtext, color) macro
 */
function renderBannerMacro(args) {
  const [height = '200px', text = '', subtext = '', color = ''] = args;

  const style = [
    `min-height: ${height}`,
    'display: flex',
    'flex-direction: column',
    'align-items: center',
    'justify-content: center',
    'text-align: center',
    'padding: var(--space-lg)',
    'margin: var(--space-lg) 0',
    'border: 3px solid var(--color-border)',
    color ? `background-color: ${color}` : 'background-color: var(--color-primary)',
    color ? `color: ${getContrastColor(color)}` : 'color: var(--color-bg)',
  ].join('; ');

  return `<div class="macro-banner" style="${style}">
    <h2 style="margin: 0; font-size: 2.5rem;">${escapeHtml(text)}</h2>
    ${subtext ? `<p style="margin: var(--space-sm) 0 0; font-size: 1.25rem; opacity: 0.9;">${escapeHtml(subtext)}</p>` : ''}
  </div>`;
}

// ============================================================================
// Markdown Parser
// ============================================================================

/**
 * Render markdown string to HTML
 */
function renderMarkdown(markdown) {
  // Normalize line endings
  let text = markdown.replace(/\r\n/g, '\n');

  // Process block-level elements first
  text = processBlockMacros(text);
  text = processCodeBlocks(text);
  text = processHeadings(text);
  text = processHorizontalRules(text);
  text = processLists(text);
  text = processBlockquotes(text);
  text = processParagraphs(text);

  // Process inline elements
  text = processInlineMacros(text);
  text = processInlineCode(text);
  text = processLinks(text);
  text = processBoldItalic(text);

  return text.trim();
}

// ============================================================================
// Block-Level Processing
// ============================================================================

/**
 * Process block macros (PascalCase)
 */
function processBlockMacros(text) {
  const macroPattern = /^\/([A-Z][a-zA-Z]*)\(([^)]*)\)\s*$/gm;

  return text.replace(macroPattern, (match, name, argsStr) => {
    const renderer = macros.block[name];
    if (!renderer) {
      return `<p class="macro-unknown">${escapeHtml(match)}</p>`;
    }

    const args = parseArgs(argsStr);
    return renderer(args);
  });
}

/**
 * Process fenced code blocks
 */
function processCodeBlocks(text) {
  const codeBlockPattern = /```(\w*)\n([\s\S]*?)```/g;

  return text.replace(codeBlockPattern, (match, lang, code) => {
    const langClass = lang ? ` class="language-${lang}"` : '';
    return `<pre><code${langClass}>${escapeHtml(code.trim())}</code></pre>`;
  });
}

/**
 * Process headings (# to ######)
 */
function processHeadings(text) {
  return text.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, content) => {
    const level = hashes.length;
    return `<h${level}>${content.trim()}</h${level}>`;
  });
}

/**
 * Process horizontal rules
 */
function processHorizontalRules(text) {
  return text.replace(/^([-*_]){3,}\s*$/gm, '<hr>');
}

/**
 * Process unordered and ordered lists
 */
function processLists(text) {
  // Process unordered lists
  text = text.replace(/^([ \t]*[-*+]\s+.+(\n|$))+/gm, (match) => {
    const items = match
      .trim()
      .split('\n')
      .map((line) => {
        const content = line.replace(/^[ \t]*[-*+]\s+/, '');
        return `<li>${content}</li>`;
      })
      .join('\n');
    return `<ul>\n${items}\n</ul>`;
  });

  // Process ordered lists
  text = text.replace(/^([ \t]*\d+\.\s+.+(\n|$))+/gm, (match) => {
    const items = match
      .trim()
      .split('\n')
      .map((line) => {
        const content = line.replace(/^[ \t]*\d+\.\s+/, '');
        return `<li>${content}</li>`;
      })
      .join('\n');
    return `<ol>\n${items}\n</ol>`;
  });

  return text;
}

/**
 * Process blockquotes
 */
function processBlockquotes(text) {
  return text.replace(/^(>\s?.+(\n|$))+/gm, (match) => {
    const content = match
      .split('\n')
      .map((line) => line.replace(/^>\s?/, ''))
      .join('\n')
      .trim();
    return `<blockquote>${content}</blockquote>`;
  });
}

/**
 * Wrap remaining text blocks in paragraphs
 */
function processParagraphs(text) {
  const blocks = text.split(/\n\n+/);

  return blocks
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';

      // Skip if already an HTML block element
      if (/^<(div|p|h[1-6]|ul|ol|li|blockquote|pre|hr|table)/i.test(trimmed)) {
        return trimmed;
      }

      // Wrap in paragraph
      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    })
    .filter(Boolean)
    .join('\n\n');
}

// ============================================================================
// Inline Processing
// ============================================================================

/**
 * Process inline macros (camelCase)
 */
function processInlineMacros(text) {
  const macroPattern = /\/([a-z][a-zA-Z]*)\(([^)]*)\)/g;

  return text.replace(macroPattern, (match, name, argsStr) => {
    const renderer = macros.inline[name];
    if (!renderer) {
      return `<span class="macro-unknown">${escapeHtml(match)}</span>`;
    }

    const args = parseArgs(argsStr);
    return renderer(args);
  });
}

/**
 * Process inline code
 */
function processInlineCode(text) {
  return text.replace(/`([^`]+)`/g, '<code>$1</code>');
}

/**
 * Process links and images
 */
function processLinks(text) {
  // Images first
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

  // Links
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  return text;
}

/**
 * Process bold and italic
 */
function processBoldItalic(text) {
  // Bold: **text** or __text__
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Italic: *text* or _text_
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  text = text.replace(/_([^_]+)_/g, '<em>$1</em>');

  return text;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Parse comma-separated arguments
 */
function parseArgs(argsStr) {
  const args = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';

  for (const char of argsStr) {
    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = '';
    } else if (char === ',' && !inQuotes) {
      args.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    args.push(current.trim());
  }

  return args.map((arg) => (arg === 'undefined' ? '' : arg));
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  const escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => escapeMap[char]);
}

/**
 * Get contrasting text color for a background
 */
function getContrastColor(hexColor) {
  const hex = hexColor.replace('#', '');

  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? '#000000' : '#ffffff';
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderMarkdown };
}

// Make available globally for browser use
if (typeof window !== 'undefined') {
  window.renderMarkdown = renderMarkdown;
}
