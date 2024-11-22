#!/usr/bin/env bun
import { skaim } from './index';

async function main() {
  const url = process.argv[2];
  const openAIKey = process.env.OPENAI_API_KEY;
  console.debug('openai key', openAIKey)

  if (!url) {
    console.error('Please provide a URL as an argument');
    process.exit(1);
  }

  if (!openAIKey) {
    console.error('OPENAI_API_KEY environment variable is not set');
    process.exit(1);
  }

  if (!url.startsWith('https://')) {
    console.error('URL must start with https://');
    process.exit(1);
  }

  try {
    const result = await skaim(url as `https://${string}`, openAIKey);
    
    console.log('Summary:\n', result.summary);
    console.log('\nExtracted Links:');
    result.links.forEach(link => {
      console.log(`- ${link.name}: ${link.url}`);
    });
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main(); 