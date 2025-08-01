# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development**: `bun dev` - Watch mode with hot reload
- **Build**: `bun run build` - Build both CLI and library outputs
- **Start**: `bun start` - Run CLI directly from source
- **Linting**: Use Biome for formatting and linting (config in biome.json)
- **Testing**: No test framework currently configured

## Environment Setup

- Requires `OPENAI_API_KEY` environment variable for API access
- Uses Bun as runtime and package manager
- Node.js compatibility maintained for distribution

## Architecture Overview

**Core Components:**
- `src/cli.ts` - Main CLI entry point with Commander.js interface
- `src/index.ts` - Library API exposing the main `clai()` function
- `src/scraper.ts` - Multi-engine web scraping with anti-detection techniques
- `src/summarizer.ts` - OpenAI-powered content summarization
- `src/openai.ts` - OpenAI client wrapper with structured response support

**Data Flow:**
1. CLI/API accepts URL or search query
2. Scraper attempts multiple search engines (SearX → Google → DuckDuckGo → Wikipedia)
3. Content extraction using Cheerio from scraped pages
4. OpenAI summarization with structured response schema
5. Terminal display with animated text and interactive link selection

**Key Design Patterns:**
- Multi-fallback strategy for search engines to avoid blocking
- Enhanced fetch with browser-like headers for anti-bot detection
- Structured OpenAI responses using function calling
- Interactive CLI with inquirer prompts and ora spinners

## Code Conventions

- Uses tabs for indentation (configured in biome.json)
- Single quotes, trailing commas, semicolons as needed
- TypeScript with strict typing
- Readonly arrays and interfaces for immutable data
- Error handling with graceful fallbacks

## Notable Dependencies

- `@fettstorch/jule` - Utility library for functional programming
- `cheerio` - Server-side HTML parsing
- `commander` - CLI framework
- `inquirer` - Interactive CLI prompts
- `ora` - Terminal spinners
- `chalk` - Terminal colors
- `openai` - Official OpenAI client

## Scraper Anti-Detection Strategy

The scraper uses sophisticated techniques to avoid being blocked:
- Rotates realistic User-Agent strings
- Complete browser header fingerprinting
- Proper Sec-Fetch metadata and client hints
- Multiple search engine fallbacks
- Respectful request patterns without rapid-fire requests