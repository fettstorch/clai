# Command Line AI Interface (CLAI)

A tool for AI powered web search/scrape and summarization in the Terminal.
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
### CLI Usage
```bash
clai https://example.com
clai "how tall can giraffes get?"
clai how tall can giraffes get
clai
```
<img width="400" src="https://github.com/user-attachments/assets/002b3e05-5c77-4f4d-8aa3-ecb7412e9538" />

The cli expects either a URL or a search query or no argument at all.
When passing a search query without quotes make sure not to use any special characters, that might confuse the CLI e.g. ?

### Programmatic API
```ts
import clai from 'clai';

const { summary, links, sources } = await clai('https://example.com', 'your-openai-api-key');
```

## Issues
- Needs a better prompt in order to more reliably stop narrating a page's content and rather cite it in a more concise manner.
- The first answer's stream animation appears to sometimes not be skippable using 'enter'
- large sites might surpass the token limit (currently not handled gracefully)

## License

ISC
