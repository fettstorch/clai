import { scrape, ScrapedData } from './scraper';
import { summarizeWebPage as summarize } from './summarizer';

export interface SummaryOutput {
  summary: string;
  links: ReadonlyArray<{
    name: string;
    url: string;
  }>;
  sources: string[];
}

/**
 * Scrapes and analyzes webpages using AI
 * @param input - URL or search query to analyze
 * @param openAIKey - OpenAI API key
 * @returns Promise with summary, extracted links, and source URLs
 * 
 * @example
 * ```ts
 * const result = await clai('https://example.com', 'your-openai-key')
 * console.log(result.summary) // AI generated summary
 * console.log(result.links) // Extracted links
 * console.log(result.sources) // Source URLs
 * ```
 */
export async function clai(input: string, openAIKey: string): Promise<SummaryOutput> {
  const scrapedData = await scrape(input);
  
  // Combine all content with source attribution
  const combinedContent = scrapedData
    .map(data => `Content from ${data.url}:\n${data.content}`)
    .join('\n\n');
  
  const result = await summarize(combinedContent, openAIKey);
  
  return {
    summary: result.textual.trim(),
    links: result.links,
    sources: scrapedData.map(data => data.url)
  };
}

// Default export for easier importing
export default clai; 