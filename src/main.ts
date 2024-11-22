import { scrape } from './scraper';
import { summarizeWebPage } from './summarizer';

async function main() {
  const url = 'https://bun.sh/docs';

  try {
    const data = await scrape(url);
    const summary = await summarizeWebPage(data.content, 200, process.env.OPENAI_API_KEY!);
    
    console.log('Summary:\n', summary.textual.trim());
    console.log('\nExtracted Links:');
    summary.links.forEach(link => {
      console.log(`- ${link.name}: ${link.url}`);
    });
  } catch (error) {
    console.error('Main error:', error);
  }
}

main(); 