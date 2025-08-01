# Command Line AI Interface (CLAI)

An AI-powered question answering tool for the terminal. Get instant answers to your questions using OpenAI, with optional web crawling capabilities.
Built for fun in order to learn more about AI and CLIs.

## Installation

Use this global installation in order to use the command line tool
```bash
npm install clai -g
```
Install it locally in order to use the clai function in your project.
```bash
npm install clai
```
Using both the CLI tool and the clai function requires an OpenAI API key. For the CLI tool make sure to set the `OPENAI_API_KEY` environment variable.

## OpenAI API Key Setup

1. Check this project's code on GitHub in order to make sure I will not store your key :)
2. Go to [OpenAI's API platform](https://platform.openai.com/api-keys)
3. Sign up or log in to your OpenAI account
4. Click "Create new secret key"
5. Copy your API key
6. Set it as an environment variable:


## Features

### Default Behavior - Direct AI Answering
By default, CLAI uses OpenAI directly to answer your questions without web crawling:

```bash
clai "how tall can giraffes get?"
clai how tall can giraffes get
clai "explain quantum computing"
clai
```

### Optional Web Crawling
Use the `-c` or `--crawl` flag to enable web scraping and search engine functionality:

```bash
clai -c "latest news about AI"
clai --crawl https://example.com
clai -c "current Bitcoin price"
```

<img width="400" src="https://github.com/user-attachments/assets/002b3e05-5c77-4f4d-8aa3-ecb7412e9538" />

The CLI accepts questions, search queries, or URLs. When passing queries without quotes, avoid special characters that might confuse the CLI (e.g., `?`).

### Programmatic API
```ts
import clai from 'clai';

// Direct AI answering (default)
const { summary, links, sources } = await clai('how tall can giraffes get?', 'your-openai-api-key');

// With web crawling enabled
const { summary, links, sources } = await clai('https://example.com', 'your-openai-api-key', true);
```

## Issues
- When using web crawling (`-c` flag): search engines often fail due to scraping protections
- When using web crawling (`-c` flag): large sites might surpass the token limit (currently not handled gracefully)
- Web crawling results may not always fit the user's query well

## License

ISC
