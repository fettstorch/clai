# Command Line AI Interface (CLAI)

A tool for AI powered web search/scrape and summarization.
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
Using both the CLI tool and the clai function requires an OpenAI API key.

## OpenAI API Key Setup

1. Go to [OpenAI's API platform](https://platform.openai.com/api-keys)
2. Sign up or log in to your OpenAI account
3. Click "Create new secret key"
4. Copy your API key
5. Set it as an environment variable:


## Features
### CLI Usage
```bash
clai https://example.com
clai "how tall can giraffes get?"
clai how tall can giraffes get
clai
```

### Programmatic API
```ts
import clai from 'clai';

const { summary, links, sources } = await clai('https://example.com', 'your-openai-api-key');
```

## License

ISC
