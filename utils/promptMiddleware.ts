export function preprocessPrompt(content: string, style: string | null = null): string {
    // Append style instructions if a style is specified
    if (style) {
      return `${content}. Please generate this image in the following style: ${style}.`;
    }
    return content;
  }
  