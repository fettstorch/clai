import { openaiClient } from './openai'

export type SummaryResult = Readonly<{
	textual: string
	links: ReadonlyArray<{
		name: string
		url: string
	}>
}>

/**
 * Summarizes content and extracts relevant links using OpenAI
 * @param content - The text content to analyze and summarize
 * @param maxLength - Maximum length of the summary in words
 * @returns Promise containing the summary text and extracted links
 * @throws Will throw an error if OpenAI API call fails
 *
 * @example
 * ```ts
 * const result = await summarizeContent(longText, 100)
 * console.log(result.textual) // Summary text
 * console.log(result.links) // Array of extracted links
 * ```
 */

export async function summarizeWebPage(
	content: string,
	openAIApiKey: string,
): Promise<SummaryResult> {
	const openai = openaiClient(openAIApiKey)

	const prompt = `Your are an expert educator. Analyze the following text and create a
  concise summary with the following guidelines:
   1. Always use bullet points, lists and tables over paragraphs.
   2. Produce valid markdown output
   3. Use the articles titles and headings as a guide
   4. Try to present the most relevant information
   5. Extract all meaningful links from the text
   6. Don't narrate the content e.g. 'The text says that the earth is round' but rather use the content itself e.g. 'The earth is round'
   7. Don't use the word 'text' or 'content' in your summary
   8. Don't try to emulate emotions or tone of the original content, always be neutral and objective
   9. If the content is instructional repeat the instructions step by step e.g.:
    - Step 1: Do this
    - Step 2: Do that
    - Step 3: Done
   10. Mark proper nouns as bold e.g. **Harry Potter**
   11. Mark headings (h1, h2, h3) as #, ##, ### respectively
  
  Don't just summarize, cite the key information.
  
  Text to analyze:\n"${content}\n"`

	const schema = {
		textual: {
			type: 'string',
			description: 'Concise summary of the text',
		},
		links: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					name: {
						type: 'string',
						description: 'Descriptive name or title of the link',
					},
					url: {
						type: 'string',
						description: 'The URL of the link',
					},
				},
				required: ['name', 'url'],
			},
		},
	}

	const result = await openai.completeStructured<SummaryResult>(prompt, {
		temperature: 0.3,
		responseSchema: schema,
	})

	return result
}
