import * as Cheerio from 'cheerio';

export interface ScrapedData {
  title: string;
  content: string;
}

/**
 * Scrapes content from a given URL and extracts structured data
 * @param url - The HTTPS URL to scrape. Must be a valid HTTPS URL.
 * @returns Promise containing the scraped title and content
 * @throws Will throw an error if fetching or parsing fails
 * 
 * @example
 * ```ts
 * const data = await scrape('https://example.com')
 * console.log(data.title) // Page title
 * console.log(data.content) // Page content
 * ```
 */

export async function scrape(url: `https://${string}`): Promise<ScrapedData> {
  try {
    const response = await fetch(url);
    const html = await response.text();
    return extractDataFromHtml(html);
  } catch (error) {
    console.error('Error scraping:', error);
    throw error;
  }
} 

// --- module private

function extractDataFromHtml(html: string): ScrapedData {
  const cheerioDoc = Cheerio.load(html);
  
  return {
    title: cheerioDoc('title').text(),
    content: cheerioDoc('body').text()
  };
}