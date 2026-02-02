/**
 * Custom Markdown Renderer with Macro Support
 *
 * Supports:
 * - Basic markdown: headings, paragraphs, lists, links, code, bold, italic
 * - Macro syntax: /MacroName(args) for block, /macroName(args) for inline
 * - MVP: Only /Banner macro implemented
 *
 * Macro Convention:
 * - PascalCase = block macro (renders as block element)
 * - camelCase = inline macro (renders as span within text)
 */

// ============================================================================
// Types
// ============================================================================

type MacroRenderer = (args: string[]) => string;

interface MacroRegistry {
  block: Record<string, MacroRenderer>;
  inline: Record<string, MacroRenderer>;
}

// ============================================================================
// Macro Registry
// ============================================================================

const macros: MacroRegistry = {
  block: {
    Banner: renderBannerMacro,
    Callout: renderCalloutMacro,
    LinkPreview: renderLinkPreviewMacro,
    Iframe: renderIframeMacro,
  },
  inline: {},
};

/**
 * Render /Banner(height, text, subtext, color) macro
 * Creates a full-width hero banner section
 */
function renderBannerMacro(args: string[]): string {
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

/**
 * Render /Callout(text) macro
 * Displays a callout box with a lightbulb icon
 */
function renderCalloutMacro(args: string[]): string {
  const [text = ''] = args;
  return `<div class="macro-callout"><svg class="macro-callout-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg><span>${escapeHtml(text)}</span></div>`;
}

/**
 * Render /LinkPreview(url, title, description, image) macro
 * Displays a rich link preview card (Ghost-style bookmark card)
 */
function renderLinkPreviewMacro(args: string[]): string {
  const [url = '', title = '', description = '', image = ''] = args;
  const displayTitle = title || url;
  let hostname = '';
  try { hostname = new URL(url).hostname; } catch { hostname = url; }
  const thumbnailHtml = image
    ? `<div class="macro-bookmark-thumbnail"><img src="${escapeHtml(image)}" alt=""></div>`
    : '';
  return `<a class="macro-bookmark" href="${escapeHtml(url)}" target="_blank" rel="noopener"><div class="macro-bookmark-content"><div class="macro-bookmark-title">${escapeHtml(displayTitle)}</div>${description ? `<div class="macro-bookmark-description">${escapeHtml(description)}</div>` : ''}<div class="macro-bookmark-meta"><span class="macro-bookmark-publisher">${escapeHtml(hostname)}</span></div></div>${thumbnailHtml}</a>`;
}

/**
 * Render /Iframe(src) macro
 * Embeds an iframe. Accepts a URL or raw HTML.
 */
function renderIframeMacro(args: string[]): string {
  const [src = ''] = args;
  // If it looks like HTML, render in a sandboxed srcdoc iframe
  if (src.trim().startsWith('<')) {
    const escaped = escapeHtml(src);
    return `<div class="macro-iframe"><iframe srcdoc="${escaped}" sandbox="allow-scripts" loading="lazy" style="width:100%;min-height:400px;border:1px solid var(--color-border);"></iframe></div>`;
  }
  return `<div class="macro-iframe"><iframe src="${escapeHtml(src)}" sandbox="allow-scripts allow-same-origin" loading="lazy" style="width:100%;min-height:400px;border:1px solid var(--color-border);" allowfullscreen></iframe></div>`;
}

// ============================================================================
// Markdown Parser
// ============================================================================

/**
 * Render markdown string to HTML
 */
export function renderMarkdown(markdown: string): string {
  // Normalize line endings
  let text = markdown.replace(/\r\n/g, '\n');

  // Process block-level elements first
  text = processTwoColumnMacros(text);
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
 * Process /TwoColumn ... /// ... /End multi-line macro
 * Renders two markdown blobs side by side
 */
function processTwoColumnMacros(text: string): string {
  const pattern = /^\/TwoColumn\s*\n([\s\S]*?)^\/End\s*$/gm;
  return text.replace(pattern, (_match, body: string) => {
    const parts = body.split(/^\/\/\/\s*$/m);
    const left = (parts[0] || '').trim();
    const right = (parts[1] || '').trim();
    const leftHtml = renderMarkdown(left);
    const rightHtml = renderMarkdown(right);
    return `<div class="macro-two-column"><div class="macro-two-column-left">${leftHtml}</div><div class="macro-two-column-right">${rightHtml}</div></div>`;
  });
}

/**
 * Process block macros (PascalCase)
 * Pattern: /MacroName(arg1, arg2, ...) on its own line
 */
function processBlockMacros(text: string): string {
  // Match macro on its own line: /PascalCase(...)
  const macroPattern = /^\/([A-Z][a-zA-Z]*)\(([^)]*)\)\s*$/gm;

  return text.replace(macroPattern, (_match, name: string, argsStr: string) => {
    const renderer = macros.block[name];
    if (!renderer) {
      // Unknown macro, leave as-is but escaped
      return `<p class="macro-unknown">${escapeHtml(_match)}</p>`;
    }

    const args = parseArgs(argsStr);
    return renderer(args);
  });
}

/**
 * Process fenced code blocks
 */
function processCodeBlocks(text: string): string {
  // Match ```language\ncode\n```
  const codeBlockPattern = /```(\w*)\n([\s\S]*?)```/g;

  return text.replace(codeBlockPattern, (_match, lang: string, code: string) => {
    const langClass = lang ? ` class="language-${lang}"` : '';
    return `<pre><code${langClass}>${escapeHtml(code.trim())}</code></pre>`;
  });
}

/**
 * Process headings (# to ######)
 */
function processHeadings(text: string): string {
  return text.replace(/^(#{1,6})\s+(.+)$/gm, (_match, hashes: string, content: string) => {
    const level = hashes.length;
    return `<h${level}>${content.trim()}</h${level}>`;
  });
}

/**
 * Process horizontal rules (---, ***, ___)
 */
function processHorizontalRules(text: string): string {
  return text.replace(/^([-*_]){3,}\s*$/gm, '<hr>');
}

/**
 * Process unordered and ordered lists
 */
function processLists(text: string): string {
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
function processBlockquotes(text: string): string {
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
function processParagraphs(text: string): string {
  // Split by double newlines
  const blocks = text.split(/\n\n+/);

  return blocks
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';

      // Skip if already an HTML block element
      if (/^<(div|p|h[1-6]|ul|ol|li|blockquote|pre|hr|table|figure|a class="macro)/i.test(trimmed)) {
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
 * Pattern: /macroName(args) within text
 */
function processInlineMacros(text: string): string {
  // Match inline macro: /camelCase(...)
  const macroPattern = /\/([a-z][a-zA-Z]*)\(([^)]*)\)/g;

  return text.replace(macroPattern, (_match, name: string, argsStr: string) => {
    const renderer = macros.inline[name];
    if (!renderer) {
      // Unknown macro, leave as-is but escaped
      return `<span class="macro-unknown">${escapeHtml(_match)}</span>`;
    }

    const args = parseArgs(argsStr);
    return renderer(args);
  });
}

/**
 * Process inline code (`code`)
 */
function processInlineCode(text: string): string {
  return text.replace(/`([^`]+)`/g, '<code>$1</code>');
}

/**
 * Process links [text](url) and images ![alt](src)
 */
function processLinks(text: string): string {
  // Images first - wrap in figure with figcaption if alt text exists
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt: string, src: string) => {
    if (alt) {
      return `<figure class="md-figure"><img src="${src}" alt="${escapeHtml(alt)}"><figcaption>${escapeHtml(alt)}</figcaption></figure>`;
    }
    return `<img src="${src}" alt="">`;
  });

  // Links
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  return text;
}

/**
 * Process bold and italic
 */
function processBoldItalic(text: string): string {
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
 * Parse comma-separated arguments, handling quoted strings
 */
function parseArgs(argsStr: string): string[] {
  const args: string[] = [];
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

  // Handle 'undefined' string as actual undefined
  return args.map((arg) => (arg === 'undefined' ? '' : arg));
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => escapeMap[char]);
}

/**
 * Get contrasting text color (black or white) for a background
 */
function getContrastColor(hexColor: string): string {
  // Remove # if present
  const hex = hexColor.replace('#', '');

  // Parse RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? '#000000' : '#ffffff';
}
