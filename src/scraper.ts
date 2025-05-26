import * as Cheerio from "cheerio";

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
      urls = await getSearchResults(input);
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
    console.error("Error during scraping:", error);
    throw error;
  }
}

// --- module private

function isValidUrl(input: string): boolean {
  // Check for whitespace
  if (input.includes(" ")) return false;

  // Check for common TLDs using regex
  const tldPattern = /^[^\s]+\.[a-z]{2,}$/i;
  return tldPattern.test(input);
}

function normalizeUrl(url: string): string {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }
  return url;
}

async function getSearchResults(query: string): Promise<string[]> {
  try {
    return await getSearXResults(query);
  } catch (_) {
    console.log("Trying Google search...");
    try {
      return await getGoogleResults(query);
    } catch (_) {
      console.log("Trying DuckDuckGo search...");
      try {
        return await getDuckDuckGoResults(query);
      } catch (_) {
        console.log("Using emergency fallback...");
        return getEmergencyResults(query);
      }
    }
  }
}

function getEmergencyResults(query: string): string[] {
  // Emergency fallback - construct likely URLs based on the query
  const results: string[] = [];

  // Try to construct some reasonable URLs based on common patterns
  const cleanQuery = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
  const words = cleanQuery.split(/\s+/).filter((word) => word.length > 2);

  if (words.length > 0) {
    const mainWord = words[0];

    // Add some likely candidates
    results.push(
      `https://en.wikipedia.org/wiki/${encodeURIComponent(
        query.replace(/\s+/g, "_")
      )}`
    );

    if (mainWord.length > 3) {
      results.push(`https://${mainWord}.com`);
      results.push(`https://www.${mainWord}.org`);
    }

    // Add a Reddit search as last resort
    results.push(
      `https://www.reddit.com/search/?q=${encodeURIComponent(query)}`
    );
  }

  console.log("Emergency fallback returning:", results.join(", "));
  return results.length > 0
    ? results.slice(0, 3)
    : [
        `https://en.wikipedia.org/wiki/${encodeURIComponent(
          query.replace(/\s+/g, "_")
        )}`,
      ];
}

async function getSearXResults(query: string): Promise<string[]> {
  // Public SearXNG instances that are scraper-friendly
  const searxInstances = [
    "https://searx.be",
    "https://search.sapti.me",
    "https://searx.tiekoetter.com",
    "https://searx.prvcy.eu",
  ];

  // Try instances until one works
  for (const instance of searxInstances) {
    try {
      const searchUrl = `${instance}/search?q=${encodeURIComponent(
        query
      )}&format=json&categories=general`;

      console.log("Trying SearX search...");

      const response = await fetch(searchUrl, {
        headers: {
          "User-Agent": getRandomUserAgent(),
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      const urls: string[] = [];

      if (data.results && Array.isArray(data.results)) {
        for (const result of data.results.slice(0, 5)) {
          if (
            result.url &&
            (result.url.startsWith("http://") ||
              result.url.startsWith("https://")) &&
            !result.url.includes("wikipedia.org") && // Skip Wikipedia for diversity
            !urls.includes(result.url)
          ) {
            urls.push(result.url);
          }
        }
      }

      if (urls.length > 0) {
        console.log(`✓ SearX found ${urls.length} results`);
        return urls.slice(0, 3); // Limit to 3 results
      }
    } catch (error) {
      // Continue to next instance
    }
  }

  throw new Error("All SearX instances failed");
}

async function getGoogleResults(query: string): Promise<string[]> {
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(
    query
  )}&num=10`;

  const html = await fetchHtml(searchUrl);
  const cheerioDoc = Cheerio.load(html);
  const urls: string[] = [];

  // Google search result links are in <a> tags with href starting with /url?q=
  cheerioDoc('a[href^="/url?q="]').each((_, element) => {
    const href = cheerioDoc(element).attr("href");
    if (href) {
      // Extract the actual URL from Google's redirect format: /url?q=ACTUAL_URL&sa=...
      const urlMatch = href.match(/\/url\?q=([^&]+)/);
      if (urlMatch) {
        try {
          const decodedUrl = decodeURIComponent(urlMatch[1]);
          // Filter out Google's own URLs and other unwanted domains
          if (
            !decodedUrl.includes("google.com") &&
            !decodedUrl.includes("youtube.com") &&
            (decodedUrl.startsWith("http://") ||
              decodedUrl.startsWith("https://"))
          ) {
            urls.push(decodedUrl);
          }
        } catch (error) {
          // Skip malformed URLs
        }
      }
    }
  });

  // Also try direct links (sometimes Google shows direct links)
  cheerioDoc('a[href^="http"]').each((_, element) => {
    const href = cheerioDoc(element).attr("href");
    if (
      href &&
      !href.includes("google.com") &&
      !href.includes("youtube.com") &&
      !urls.includes(href)
    ) {
      urls.push(href);
    }
  });

  // Remove duplicates and limit to first 3 results
  const uniqueUrls = [...new Set(urls)].slice(0, 3);

  if (uniqueUrls.length === 0) {
    throw new Error("No search results found in Google response");
  }

  console.log(`✓ Google found ${uniqueUrls.length} results`);
  return uniqueUrls;
}

async function getDuckDuckGoResults(query: string): Promise<string[]> {
  const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(
    query
  )}&format=json&no_html=1&skip_disambig=1`;

  const response = await fetch(searchUrl);
  const data = await response.json();

  const urls: string[] = [];

  if (data.AbstractURL) {
    urls.push(data.AbstractURL);
  }

  if (data.RelatedTopics) {
    for (const topic of data.RelatedTopics.slice(0, 2)) {
      if (topic.FirstURL) {
        urls.push(topic.FirstURL);
      }
    }
  }

  if (urls.length === 0) {
    throw new Error("No search results found in DuckDuckGo response");
  }

  console.log(`✓ DuckDuckGo found ${urls.length} results`);
  return urls;
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": getRandomUserAgent(),
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      DNT: "1",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Cache-Control": "max-age=0",
    },
  });
  return response.text();
}

function getRandomUserAgent(): string {
  const userAgents = [
    // Latest Chrome on macOS
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    // Latest Chrome on Windows
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    // Latest Firefox on macOS
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:132.0) Gecko/20100101 Firefox/132.0",
    // Latest Firefox on Windows
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
    // Latest Safari on macOS
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
    // Latest Edge on Windows
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
  ];

  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

function extractDataFromHtml(html: string): ScrapedData {
  const cheerioDoc = Cheerio.load(html);
  return {
    title: cheerioDoc("title").text(),
    content: cheerioDoc("body").text(),
    url: cheerioDoc('link[rel="canonical"]').attr("href") || "",
  };
}
