/**
 * Client-side file parsing utilities.
 */

export async function extractTextFromFile(file: File): Promise<string> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  
  if (extension === "txt" || extension === "md" || extension === "csv" || extension === "json") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
  
  // For PDF, we could use pdfjs-dist via a CDN if needed, 
  // but for now we'll rely on the Gemini API's native PDF support
  if (extension === "pdf") {
    return "[PDF structured data - will be processed by Athena's vision/document engine]";
  }
  
  return "";
}

export function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "document";
}
