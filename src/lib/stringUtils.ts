/**
 * Utility to strip Markdown symbols and special characters for a clean plain-text output.
 */
export function stripMarkdownSymbols(text: string): string {
  if (!text) return "";
  
  return text
    // Remove headers (# Header)
    .replace(/^#+\s+/gm, '')
    // Remove bold/italic (***bold***, **bold**, *italic*, __bold__, _italic_)
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // Remove inline code (`code`)
    .replace(/`(.*?)`/g, '$1')
    // Remove blockquotes (> quote)
    .replace(/^\s*>\s+/gm, '')
    // Remove list markers (- item, * item, + item)
    .replace(/^\s*[-*+]\s+/gm, '')
    // Remove numbered list markers (1. item)
    .replace(/^\s*\d+\.\s+/gm, '')
    // Remove links [text](url) -> text
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    // Remove horizontal rules
    .replace(/^\s*[-*_]{3,}\s*$/gm, '')
    // Remove emojis and other special non-alphanumeric symbols (optional, keeping common punctuation)
    // .replace(/[^\w\s\p{P}\p{L}]/gu, '') 
    .trim();
}
