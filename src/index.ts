import { scrape } from './scraper'
import { summarizeWebPage as summarize, summarizeQuery } from './summarizer'

export interface SummaryOutput {
	summary: string
	links: ReadonlyArray<{
		name: string
		url: string
	}>
	sources: string[]
}

/**
 * Analyzes queries using AI, with optional web crawling
 * @param input - URL or search query to analyze
 * @param openAIKey - OpenAI API key
 * @param useCrawling - Whether to enable web crawling and search engines (default: false)
 * @returns Promise with summary, extracted links, and source URLs
 *
 * @example
 * ```ts
 * const result = await clai('how tall can giraffes get?', 'your-openai-key')
 * console.log(result.summary) // AI generated summary
 * console.log(result.links) // Extracted links
 * console.log(result.sources) // Source URLs
 * ```
 */
export async function clai(
	input: string,
	openAIKey: string,
	useCrawling = false,
): Promise<SummaryOutput> {
	// If crawling is not enabled, use OpenAI directly
	if (!useCrawling) {
		const result = await summarizeQuery(input, openAIKey)
		return {
			summary: result.textual.trim(),
			links: result.links,
			sources: ['OpenAI Knowledge Base'],
		}
	}

	// Crawling is enabled - attempt to scrape first
	const scrapedData = await scrape(input)

	// Check if we have useful scraped data (not just error pages)
	const usefulData = scrapedData.filter(
		(data) =>
			data.content.length > 200 &&
			!data.content.includes('Wikipedia does not have an article') &&
			!data.content.includes('page not found') &&
			!data.content.includes('404') &&
			!data.content.includes('error'),
	)

	// If we have useful scraped data, use it
	if (usefulData.length > 0) {
		// Combine all useful content with source attribution
		const combinedContent = usefulData
			.map((data) => `Content from ${data.url}:\n${data.content}`)
			.join('\n\n')

		const result = await summarize(combinedContent, openAIKey)

		return {
			summary: result.textual.trim(),
			links: result.links,
			sources: usefulData.map((data) => data.url),
		}
	}

	// If crawling enabled but no scraped data available, fallback to OpenAI
	console.log('No scraped data available - falling back to OpenAI...')
	const result = await summarizeQuery(input, openAIKey)

	return {
		summary: result.textual.trim(),
		links: result.links,
		sources: ['OpenAI Knowledge Base'],
	}
}

// Default export for easier importing
export default clai
