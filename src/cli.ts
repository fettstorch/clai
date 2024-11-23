#!/usr/bin/env bun
import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { clai } from './index';

const program = new Command();

async function main() {
  try {
    program
      .name('clai')
      .description('AI-powered web scraping tool')
      .version('1.0.0')
      .argument('[input...]', 'URL or search terms to analyze')
      .action(async (inputs: string[]) => {
        const openAIKey = process.env.OPENAI_API_KEY;
        
        if (!openAIKey) {
          console.error(chalk.red('❌ OPENAI_API_KEY environment variable is not set'));
          process.exit(1);
        }

        let input = inputs?.join(' ');
        
        if (!input) {
          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'input',
              message: 'Enter a URL or search query:',
              validate: (input) => input.length > 0
            }
          ]);
          input = answers.input;
        }

        await analyzeInput(input, openAIKey);
        process.exit(0);
      });

    await program.parseAsync();
  } catch (error) {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  }
}

async function animateText(text: string, delay = 25) {
  let shouldComplete = false;
  
  // Setup keypress listener
  const keypressHandler = (str: string, key: { name: string }) => {
    if (key.name === 'return') {
      shouldComplete = true;
    }
  };
  
  process.stdin.on('keypress', keypressHandler);
  
  // Enable raw mode to get keypress events
  process.stdin.setRawMode(true);
  process.stdin.resume();
  
  let currentIndex = 0;
  while (currentIndex < text.length) {
    if (shouldComplete) {
      // Show remaining text immediately
      process.stdout.write(text.slice(currentIndex));
      break;
    }
    
    process.stdout.write(text[currentIndex]);
    currentIndex++;
    
    if (!shouldComplete) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // Cleanup
  process.stdin.setRawMode(false);
  process.stdin.pause();
  process.stdin.removeListener('keypress', keypressHandler);
  
  process.stdout.write('\n');
}

function formatMarkdownForTerminal(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, (_, content) => chalk.bold(content));
}

async function analyzeInput(input: string, openAIKey: string) {
  const spinner = ora('Analyzing content...').start();
  
  try {
    const result = await clai(input, openAIKey);
    spinner.succeed('Analysis complete');
    
    console.log(chalk.green.bold('\n📝 Summary:'));
    const formattedContent = formatMarkdownForTerminal(result.summary);
    await animateText(formattedContent);
    
    // Prompt user to select a link
    const { selectedLink } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedLink',
        message: '\n\nWhat now?:',
        choices: [
          { name: chalk.yellow('🔍 New search'), value: 'new' },
          ...result.links.map(link => ({
            name: `${chalk.bold(link.name)}: ${chalk.cyan(link.url)}`,
            value: link.url
          })),
          { name: 'Exit', value: 'exit' }
        ]
      }
    ]);

    if (selectedLink === 'new') {
      const { input: newInput } = await inquirer.prompt([
        {
          type: 'input',
          name: 'input',
          message: 'Enter a URL or search query:',
          validate: (input) => input.length > 0
        }
      ]);
      await analyzeInput(newInput, openAIKey);
    } else if (selectedLink && selectedLink !== 'exit') {
      await analyzeInput(selectedLink, openAIKey);
    }

  } catch (error) {
    spinner?.fail('Analysis failed');
    console.error(chalk.red('Error:'), error);
  }
}

main(); 