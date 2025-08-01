import * as Cheerio from 'cheerio'

/**
 * ANTI-SCRAPING DETECTION STRATEGY
 *
 * This scraper uses several techniques to avoid being detected as a bot:
 *
 * 1. BROWSER MIMICRY:
 *    - Complete HTTP headers that match real browsers
 *    - Randomized but realistic User-Agent strings
 *    - Proper Sec-Fetch metadata and client hints
 *
 * 2. SEARCH ENGINE DIVERSITY:
 *    - Try SearX instances first (scraper-friendly)
 *    - Fallback to Google with careful HTML parsing
 *    - DuckDuckGo API as secondary fallback
 *    - Emergency constructed URLs as last resort
 *
 * 3. RESPECTFUL BEHAVIOR:
 *    - Single request per user interaction (no rapid-fire requests)
 *    - Proper error handling without retries that could trigger rate limits
 *    - Clean fallback chain that doesn't hammer failed services
 *
 * MAINTENANCE NOTES:
 * - Update User-Agent strings every few months
 * - Monitor SearX instance availability
 * - Watch for changes in Google's HTML structure
 */

export interface ScrapedData {
	title: string
	content: string
	url: string
}

export async function scrape(input: string): Promise<ScrapedData[]> {
	try {
		let urls: string[]

		if (isValidUrl(input)) {
			urls = [normalizeUrl(input)]
		} else {
			urls = await getSearchResults(input)
		}

		// Fetch all URLs in parallel
		const results = await Promise.all(
			urls.map(async (url) => {
				try {
					const html = await fetchHtml(url)
					const data = extractDataFromHtml(html)
					return { ...data, url }
				} catch (error) {
					console.error(`Error scraping ${url}:`, error)
					return null
				}
			}),
		)

		// Filter out failed scrapes
		return results.filter((result): result is ScrapedData => result !== null)
	} catch (error) {
		// If search engines fail, return empty array to trigger OpenAI fallback
		return []
	}
}

// --- module private

function isValidUrl(input: string): boolean {
	// Check for whitespace
	if (input.includes(' ')) return false

	// Check for common TLDs using regex
	const tldPattern = /^[^\s]+\.[a-z]{2,}$/i
	return tldPattern.test(input)
}

function normalizeUrl(url: string): string {
	if (!url.startsWith('http://') && !url.startsWith('https://')) {
		return `https://${url}`
	}
	return url
}

async function getSearchResults(query: string): Promise<string[]> {
	const searchEngines = [
		{ name: 'SearX', fn: getSearXResults },
		{ name: 'Google', fn: getGoogleResults },
		{ name: 'DuckDuckGo', fn: getDuckDuckGoResults },
		{ name: 'Wikipedia', fn: getWikipediaResults },
	]

	for (const engine of searchEngines) {
		try {
			const result = await engine.fn(query)
			console.log(`[${engine.name}]::${String.fromCodePoint(0x2705)}`)
			return result
		} catch (_) {
			console.log(`[${engine.name}]::${String.fromCodePoint(0x274c)}`)
		}
	}

	console.log('All search engines failed - no URLs to scrape')
	throw new Error('No search results available')
}

async function getSearXResults(query: string): Promise<string[]> {
	// Keep a minimal list since most SearX instances block automation
	const searxInstances = ['https://searx.be', 'https://search.sapti.me']

	// Try instances until one works
	for (const instance of searxInstances) {
		try {
			const searchUrl = `${instance}/search?q=${encodeURIComponent(
				query,
			)}&format=json&categories=general`

			// Use enhancedFetch with JSON Accept header for API requests
			// This makes the request look like a legitimate AJAX call
			const response = await enhancedFetch(searchUrl, {
				headers: {
					Accept: 'application/json',
				},
			})

			if (!response.ok) {
				// Likely blocked - continue silently to next instance
				continue
			}

			const data = await response.json()
			const urls: string[] = []

			if (data.results && Array.isArray(data.results)) {
				for (const result of data.results.slice(0, 5)) {
					if (
						result.url &&
						(result.url.startsWith('http://') ||
							result.url.startsWith('https://')) &&
						!result.url.includes('wikipedia.org') && // Skip Wikipedia for diversity
						!urls.includes(result.url)
					) {
						urls.push(result.url)
					}
				}
			}

			if (urls.length > 0) {
				return urls.slice(0, 3) // Limit to 3 results
			}
		} catch (error) {
			// Continue to next instance silently
		}
	}

	throw new Error('All SearX instances failed')
}

async function getWikipediaResults(query: string): Promise<string[]> {
	// Wikipedia's OpenSearch API - designed for automation and doesn't block
	const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(
		query,
	)}&limit=3&format=json&origin=*`

	const response = await enhancedFetch(searchUrl, {
		headers: {
			Accept: 'application/json',
		},
	})

	if (!response.ok) {
		throw new Error(`Wikipedia API error: ${response.status}`)
	}

	const data = await response.json()

	// Wikipedia OpenSearch returns [query, titles, descriptions, urls]
	if (Array.isArray(data) && data.length >= 4 && Array.isArray(data[3])) {
		const urls = data[3]?.filter((url: string) => url?.startsWith('https://'))

		if (urls?.length > 0) {
			return urls
		}
	}

	throw new Error('No Wikipedia results found')
}

async function getGoogleResults(query: string): Promise<string[]> {
	const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(
		query,
	)}&num=10`

	// Fetch Google search page using enhanced headers to avoid bot detection
	const html = await fetchHtml(searchUrl)

	// Check if Google is blocking us
	if (
		html.includes("If you're having trouble accessing Google Search") ||
		html.includes('unusual traffic from your computer network')
	) {
		throw new Error('Google blocked request - detected as bot')
	}

	const cheerioDoc = Cheerio.load(html)
	const urls: string[] = []

	// Google search result links are in <a> tags with href starting with /url?q=
	cheerioDoc('a[href^="/url?q="]').each((_, element) => {
		const href = cheerioDoc(element).attr('href')
		if (href) {
			// Extract the actual URL from Google's redirect format: /url?q=ACTUAL_URL&sa=...
			const urlMatch = href.match(/\/url\?q=([^&]+)/)
			if (urlMatch) {
				try {
					const decodedUrl = decodeURIComponent(urlMatch[1])
					// Filter out Google's own URLs and other unwanted domains
					if (
						!decodedUrl.includes('google.com') &&
						!decodedUrl.includes('youtube.com') &&
						(decodedUrl.startsWith('http://') ||
							decodedUrl.startsWith('https://'))
					) {
						urls.push(decodedUrl)
					}
				} catch (error) {
					// Skip malformed URLs
				}
			}
		}
	})

	// Also try direct links (sometimes Google shows direct links)
	cheerioDoc('a[href^="http"]').each((_, element) => {
		const href = cheerioDoc(element).attr('href')
		if (
			href &&
			!href.includes('google.com') &&
			!href.includes('youtube.com') &&
			!urls.includes(href)
		) {
			urls.push(href)
		}
	})

	// Remove duplicates and limit to first 3 results
	const uniqueUrls = [...new Set(urls)].slice(0, 3)

	if (uniqueUrls.length === 0) {
		throw new Error('No search results found in Google response')
	}

	return uniqueUrls
}

async function getDuckDuckGoResults(query: string): Promise<string[]> {
	const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(
		query,
	)}&format=json&no_html=1&skip_disambig=1`

	// DuckDuckGo API is more lenient but still benefits from browser-like headers
	const response = await enhancedFetch(searchUrl)

	if (!response.ok) {
		throw new Error(`DuckDuckGo API error: ${response.status}`)
	}

	const data = await response.json()

	// Check for DuckDuckGo blocking patterns
	if (
		data.Abstract?.includes('redirects users to a non-JavaScript site') ||
		data.Abstract?.includes('DuckDuckGo redirects users') ||
		data.AbstractText?.includes('redirects users to a non-JavaScript site') ||
		data.AbstractText?.includes('DuckDuckGo redirects users')
	) {
		throw new Error('DuckDuckGo blocked request - JavaScript disabled redirect')
	}

	const urls: string[] = []

	if (data.AbstractURL) {
		urls.push(data.AbstractURL)
	}

	if (data.RelatedTopics) {
		for (const topic of data.RelatedTopics.slice(0, 2)) {
			if (topic.FirstURL) {
				urls.push(topic.FirstURL)
			}
		}
	}

	// If no direct URLs, try definition URL
	if (urls.length === 0 && data.DefinitionURL) {
		urls.push(data.DefinitionURL)
	}

	if (urls.length === 0) {
		throw new Error('No search results found in DuckDuckGo response')
	}

	return urls
}

/**
 * Enhanced fetch function that mimics real browser behavior to avoid scraping detection
 *
 * Anti-detection techniques used:
 * 1. Complete browser fingerprint with all expected headers
 * 2. Client hints that modern browsers send automatically
 * 3. Proper Sec-Fetch metadata for legitimate navigation
 * 4. Cache control headers to prevent suspicious caching patterns
 */
async function enhancedFetch(
	url: string,
	options: RequestInit = {},
): Promise<Response> {
	const headers = {
		// Randomized but realistic User-Agent from our pool
		'User-Agent': getRandomUserAgent(),

		// Standard browser Accept header - tells server what content types we can handle
		Accept:
			'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',

		// Language preferences - indicates we prefer English
		'Accept-Language': 'en-US,en;q=0.9',

		// Compression support - modern browsers support these
		'Accept-Encoding': 'gzip, deflate, br',

		// CLIENT HINTS - Modern browsers send these automatically
		// Tells server we're Chrome 121 (matches our User-Agent)
		'sec-ch-ua':
			'"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',

		// Indicates we're on desktop (not mobile)
		'sec-ch-ua-mobile': '?0',

		// Platform information (macOS in this case)
		'sec-ch-ua-platform': '"macOS"',

		// SEC-FETCH METADATA - Critical for avoiding detection
		// Tells server this is a document request (not an API call)
		'Sec-Fetch-Dest': 'document',

		// Indicates this is a navigation (user clicking a link)
		'Sec-Fetch-Mode': 'navigate',

		// Cross-site navigation (coming from different domain)
		'Sec-Fetch-Site': 'cross-site',

		// User-initiated request (not automatic/script)
		'Sec-Fetch-User': '?1',

		// Indicates we want HTTPS when possible
		'Upgrade-Insecure-Requests': '1',

		// CACHE CONTROL - Prevents suspicious caching patterns
		// Don't use cached responses
		'Cache-Control': 'no-cache',

		// Legacy cache control for older servers
		Pragma: 'no-cache',

		// Allow caller to override any headers if needed
		...options.headers,
	}

	return fetch(url, {
		...options,
		headers,
	})
}

async function fetchHtml(url: string): Promise<string> {
	const response = await enhancedFetch(url)
	return response.text()
}

/**
 * Returns a random User-Agent string from a pool of current, realistic browser strings
 *
 * Why this helps avoid detection:
 * 1. Rotating User-Agents prevents fingerprinting based on consistent UA
 * 2. All UAs are current versions (as of late 2024) - old versions are suspicious
 * 3. Mix of browsers/platforms makes traffic look more natural
 * 4. These exact strings are used by millions of real users
 *
 * Maintenance note: Update these every few months to stay current
 */
function getRandomUserAgent(): string {
	const userAgents = [
		// Latest Chrome on macOS (most common desktop browser)
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',

		// Latest Chrome on Windows (largest user base)
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',

		// Latest Firefox on macOS (privacy-conscious users)
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:132.0) Gecko/20100101 Firefox/132.0',

		// Latest Firefox on Windows
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',

		// Latest Safari on macOS (default Mac browser)
		'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',

		// Latest Edge on Windows (default Windows browser)
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
	]

	return userAgents[Math.floor(Math.random() * userAgents.length)]
}

function extractDataFromHtml(html: string): ScrapedData {
	const cheerioDoc = Cheerio.load(html)
	return {
		title: cheerioDoc('title').text(),
		content: cheerioDoc('body').text(),
		url: cheerioDoc('link[rel="canonical"]').attr('href') || '',
	}
}
