/**
 * Utility to strip Markdown symbols and special characters for a clean plain-text output.
 */
export function stripMarkdownSymbols(text: string): string {
  if (!text) return "";
  
  // 1. Remove Table lines (starting/containing lots of | and ---)
  const lines = text.split('\n');
  const cleanLines = lines.filter(line => {
    const trimmed = line.trim();
    // Typical table markers
    if (trimmed.startsWith('|') && (trimmed.includes('---') || trimmed.includes(':---'))) return false;
    // Heuristic: If line has more than 2 pipes, it's probably a table row
    if ((trimmed.match(/\|/g) || []).length > 2) return false;
    return true;
  });

  return cleanLines.join('\n')
    // 2. Remove decorative dividers (===, ---, ___, ***)
    .replace(/^[=\-_*]{3,}$/gm, '')
    // 3. Remove Markdown headers
    .replace(/^#+\s+/gm, '')
    // 4. Remove bold/italic symbols
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // 5. Remove link symbols but keep text
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    // 6. Remove list markers (bullet and numeric)
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    // 7. Remove any leftover pipes and backticks
    .replace(/[|`]/g, ' ')
    // 8. Normalize multiple newlines and spaces
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}
