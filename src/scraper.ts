import * as Cheerio from 'cheerio';

export interface ScrapedData {
  title: string;
  content: string;
}

export async function scrape(input: string): Promise<ScrapedData> {
  try {
    let url: string;
    
    if (isValidUrl(input)) {
      url = normalizeUrl(input);
    } else {
      url = await getGoogleFirstResult(input);
    }

    const html = await fetchHtml(url);
    return extractDataFromHtml(html);
  } catch (error) {
    console.error('Error during scraping:', error);
    throw error;
  }
}

// --- module private

function isValidUrl(input: string): boolean {
  return !input.includes(' ');
}

function normalizeUrl(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
}

async function getGoogleFirstResult(query: string): Promise<string> {
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  const html = await fetchHtml(searchUrl);
  
  // URL regex pattern
  const urlPattern = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
  
  // Find all URLs in the HTML
  const urls = html.match(urlPattern) || [];

  console.debug('urls: ', urls);
  
  // Split query into words, normalize them, and filter out short words
  const queryWords = query
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2);

  console.debug('queryWords: ', queryWords);
  
  // Filter URLs and remove duplicates using Set
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

  console.debug('filteredUrls: ', [...filteredUrls]);

  const firstResult = [...filteredUrls][0];
  
  if (!firstResult) {
    throw new Error('No search results found');
  }
  
  return firstResult;
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
    content: cheerioDoc('body').text()
  };
}