import * as Cheerio from 'cheerio';

export interface ScrapedData {
  title: string;
  content: string;
  url: string;
}

export async function scrape(input: string): Promise<ScrapedData[]> {
  try {
    let urls: string[];
    
    if (isValidUrl(input)) {
      urls = [normalizeUrl(input)];
    } else {
      urls = await getGoogleResults(input);
    }

    // Fetch all URLs in parallel
    const results = await Promise.all(
      urls.map(async (url) => {
        try {
          const html = await fetchHtml(url);
          const data = extractDataFromHtml(html);
          return { ...data, url };
        } catch (error) {
          console.error(`Error scraping ${url}:`, error);
          return null;
        }
      })
    );

    // Filter out failed scrapes
    return results.filter((result): result is ScrapedData => result !== null);
  } catch (error) {
    console.error('Error during scraping:', error);
    throw error;
  }
}

// --- module private

function isValidUrl(input: string): boolean {
  // Check for whitespace
  if (input.includes(' ')) return false;
  
  // Check for common TLDs using regex
  const tldPattern = /^[^\s]+\.[a-z]{2,}$/i;
  return tldPattern.test(input);
}

function normalizeUrl(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
}

async function getGoogleResults(query: string): Promise<string[]> {
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  const html = await fetchHtml(searchUrl);
  
  const urlPattern = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
  const urls = html.match(urlPattern) || [];
  
  const queryWords = query
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2);
  
  const filteredUrls = new Set(
    urls.filter(url => {
      const urlLower = url.toLowerCase();
      return !urlLower.includes('www.google') && 
             !urlLower.includes('gstatic.com') && 
             !urlLower.includes('googleapis.com') &&
             !urlLower.includes('googleadservices') &&
             queryWords.some(word => urlLower.includes(word));
    })
  );

  console.log('queryWords', queryWords);
  console.log('filteredUrls', filteredUrls);

  const results = [...filteredUrls].slice(0, 3);
  
  if (results.length === 0) {
    throw new Error('No search results found');
  }
  
  return results;
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });
  return response.text();
}

function extractDataFromHtml(html: string): ScrapedData {
  const cheerioDoc = Cheerio.load(html);
  return {
    title: cheerioDoc('title').text(),
    content: cheerioDoc('body').text(),
    url: cheerioDoc('link[rel="canonical"]').attr('href') || ''
  };
}