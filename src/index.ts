import { scrape } from './scraper';
import { summarizeWebPage as summarize } from './summarizer';

export interface SummaryOutput {
  summary: string;
  links: ReadonlyArray<{
    name: string;
    url: string;
  }>;
}

/**
 * Scrapes and analyzes a webpage using AI
 * @param input - The HTTPS URL to analyze
 * @param openAIKey - OpenAI API key
 * @returns Promise with summary and extracted links
 * 
 * @example
 * ```ts
 * const result = await skaim('https://example.com', 'your-openai-key')
 * console.log(result.summary) // AI generated summary
 * console.log(result.links) // Extracted links
 * ```
 */
export async function skaim(input: string, openAIKey: string): Promise<SummaryOutput> {
  const data = await scrape(input);
  const result = await summarize(data.content, 400, openAIKey);
  
  return {
    summary: result.textual.trim(),
    links: result.links
  };
}

// Default export for easier importing
export default skaim; 