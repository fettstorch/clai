# Command Line AI Interface (CLAI)

A tool for AI powered web search/scrape and summarization in the Terminal.
Built for fun during a hack/jam in order to learn more about AI and CLIs.

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

1. Check this project's code on GitHub in order to make sure I will not store your key :)
2. Go to [OpenAI's API platform](https://platform.openai.com/api-keys)
3. Sign up or log in to your OpenAI account
4. Click "Create new secret key"
5. Copy your API key
6. Set it as an environment variable:


## Features
### CLI Usage
```bash
clai https://example.com
clai "how tall can giraffes get?"
clai how tall can giraffes get
clai
```
<img width="300" src="https://github.com/user-attachments/assets/f4a81e24-ef5b-42b7-bca7-188763d4e5cf" />


### Programmatic API
```ts
import clai from 'clai';

const { summary, links, sources } = await clai('https://example.com', 'your-openai-api-key');
```

## License

ISC
