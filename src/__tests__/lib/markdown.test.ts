/**
 * Markdown Renderer Tests
 *
 * Tests for custom markdown rendering with macro support.
 */

import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '../../lib/markdown';

describe('Markdown Renderer', () => {
  describe('Headings', () => {
    it('should render h1', () => {
      expect(renderMarkdown('# Heading 1')).toBe('<h1>Heading 1</h1>');
    });

    it('should render h2', () => {
      expect(renderMarkdown('## Heading 2')).toBe('<h2>Heading 2</h2>');
    });

    it('should render h3', () => {
      expect(renderMarkdown('### Heading 3')).toBe('<h3>Heading 3</h3>');
    });

    it('should render h4', () => {
      expect(renderMarkdown('#### Heading 4')).toBe('<h4>Heading 4</h4>');
    });

    it('should render h5', () => {
      expect(renderMarkdown('##### Heading 5')).toBe('<h5>Heading 5</h5>');
    });

    it('should render h6', () => {
      expect(renderMarkdown('###### Heading 6')).toBe('<h6>Heading 6</h6>');
    });

    it('should handle heading with extra spaces', () => {
      expect(renderMarkdown('#   Heading')).toBe('<h1>Heading</h1>');
    });
  });

  describe('Paragraphs', () => {
    it('should wrap text in paragraph', () => {
      expect(renderMarkdown('Simple paragraph')).toBe('<p>Simple paragraph</p>');
    });

    it('should handle multiple paragraphs', () => {
      const result = renderMarkdown('Paragraph 1\n\nParagraph 2');
      expect(result).toContain('<p>Paragraph 1</p>');
      expect(result).toContain('<p>Paragraph 2</p>');
    });

    it('should convert single newlines to br', () => {
      const result = renderMarkdown('Line 1\nLine 2');
      expect(result).toContain('<br>');
    });
  });

  describe('Bold and Italic', () => {
    it('should render bold with double asterisks', () => {
      expect(renderMarkdown('**bold text**')).toContain('<strong>bold text</strong>');
    });

    it('should render bold with double underscores', () => {
      expect(renderMarkdown('__bold text__')).toContain('<strong>bold text</strong>');
    });

    it('should render italic with single asterisk', () => {
      expect(renderMarkdown('*italic text*')).toContain('<em>italic text</em>');
    });

    it('should render italic with single underscore', () => {
      expect(renderMarkdown('_italic text_')).toContain('<em>italic text</em>');
    });

    it('should handle mixed bold and italic', () => {
      const result = renderMarkdown('**bold** and *italic*');
      expect(result).toContain('<strong>bold</strong>');
      expect(result).toContain('<em>italic</em>');
    });
  });

  describe('Links', () => {
    it('should render links', () => {
      const result = renderMarkdown('[Link Text](https://example.com)');
      expect(result).toContain('<a href="https://example.com">Link Text</a>');
    });

    it('should render multiple links', () => {
      const result = renderMarkdown('[Link 1](url1) and [Link 2](url2)');
      expect(result).toContain('<a href="url1">Link 1</a>');
      expect(result).toContain('<a href="url2">Link 2</a>');
    });
  });

  describe('Images', () => {
    it('should render images', () => {
      const result = renderMarkdown('![Alt text](image.jpg)');
      expect(result).toContain('<img src="image.jpg" alt="Alt text">');
    });

    it('should handle empty alt text', () => {
      const result = renderMarkdown('![](image.jpg)');
      expect(result).toContain('<img src="image.jpg" alt="">');
    });
  });

  describe('Code', () => {
    it('should render inline code', () => {
      expect(renderMarkdown('Use `const` keyword')).toContain('<code>const</code>');
    });

    it('should render code blocks', () => {
      const result = renderMarkdown('```javascript\nconst x = 1;\n```');
      expect(result).toContain('<pre><code');
      expect(result).toContain('const x = 1;');
    });

    it('should add language class to code blocks', () => {
      const result = renderMarkdown('```python\nprint("hello")\n```');
      expect(result).toContain('class="language-python"');
    });

    it('should escape HTML in code blocks', () => {
      const result = renderMarkdown('```\n<script>alert("xss")</script>\n```');
      expect(result).toContain('&lt;script&gt;');
      expect(result).not.toContain('<script>alert');
    });
  });

  describe('Lists', () => {
    it('should render unordered list with dash', () => {
      const result = renderMarkdown('- Item 1\n- Item 2\n- Item 3');
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>Item 1</li>');
      expect(result).toContain('<li>Item 2</li>');
      expect(result).toContain('<li>Item 3</li>');
      expect(result).toContain('</ul>');
    });

    it('should render unordered list with asterisk', () => {
      const result = renderMarkdown('* Item 1\n* Item 2');
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>Item 1</li>');
    });

    it('should render unordered list with plus', () => {
      const result = renderMarkdown('+ Item 1\n+ Item 2');
      expect(result).toContain('<ul>');
    });

    it('should render ordered list', () => {
      const result = renderMarkdown('1. First\n2. Second\n3. Third');
      expect(result).toContain('<ol>');
      expect(result).toContain('<li>First</li>');
      expect(result).toContain('<li>Second</li>');
      expect(result).toContain('<li>Third</li>');
      expect(result).toContain('</ol>');
    });
  });

  describe('Blockquotes', () => {
    it('should render blockquote', () => {
      const result = renderMarkdown('> This is a quote');
      expect(result).toContain('<blockquote>This is a quote</blockquote>');
    });

    it('should render multi-line blockquote', () => {
      const result = renderMarkdown('> Line 1\n> Line 2');
      expect(result).toContain('<blockquote>');
      expect(result).toContain('Line 1');
      expect(result).toContain('Line 2');
    });
  });

  describe('Horizontal Rules', () => {
    it('should render hr with dashes', () => {
      expect(renderMarkdown('---')).toContain('<hr>');
    });

    it('should render hr with asterisks', () => {
      expect(renderMarkdown('***')).toContain('<hr>');
    });

    it('should render hr with underscores', () => {
      expect(renderMarkdown('___')).toContain('<hr>');
    });

    it('should render hr with extra characters', () => {
      expect(renderMarkdown('-----')).toContain('<hr>');
    });
  });

  describe('Block Macros (PascalCase)', () => {
    it('should render Banner macro', () => {
      const result = renderMarkdown('/Banner(200px, Hello, Welcome, #ff6b00)');
      expect(result).toContain('macro-banner');
      expect(result).toContain('Hello');
      expect(result).toContain('Welcome');
    });

    it('should render Banner with default values', () => {
      const result = renderMarkdown('/Banner()');
      expect(result).toContain('macro-banner');
    });

    it('should handle unknown block macro', () => {
      const result = renderMarkdown('/UnknownMacro(arg1, arg2)');
      expect(result).toContain('macro-unknown');
      expect(result).toContain('/UnknownMacro');
    });
  });

  describe('Inline Macros (camelCase)', () => {
    it('should mark unknown inline macro', () => {
      const result = renderMarkdown('Check out /unknownMacro(arg) here');
      expect(result).toContain('macro-unknown');
    });
  });

  describe('Complex Documents', () => {
    it('should handle mixed content', () => {
      const markdown = `# Title

This is a **paragraph** with *emphasis*.

## Section

- List item 1
- List item 2

> A quote

\`\`\`javascript
const code = true;
\`\`\`

[A link](https://example.com)`;

      const result = renderMarkdown(markdown);
      expect(result).toContain('<h1>Title</h1>');
      expect(result).toContain('<strong>paragraph</strong>');
      expect(result).toContain('<em>emphasis</em>');
      expect(result).toContain('<h2>Section</h2>');
      expect(result).toContain('<ul>');
      expect(result).toContain('<blockquote>');
      expect(result).toContain('<pre><code');
      expect(result).toContain('<a href="https://example.com">');
    });

    it('should handle Windows line endings', () => {
      const result = renderMarkdown('Line 1\r\nLine 2\r\n\r\nParagraph 2');
      expect(result).toContain('Line 1');
      expect(result).toContain('Line 2');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      expect(renderMarkdown('')).toBe('');
    });

    it('should handle whitespace only', () => {
      const result = renderMarkdown('   \n\n   ');
      expect(result.trim()).toBe('');
    });

    it('should handle special characters in text', () => {
      // Characters that aren't markdown syntax should be preserved
      const result = renderMarkdown('Price: $100 @ 50% off');
      expect(result).toContain('$100');
      expect(result).toContain('@');
      expect(result).toContain('%');
    });
  });
});
