#!/usr/bin/env bun
import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { skaim } from './index';

const program = new Command();

async function main() {
  try {
    program
      .name('skaim')
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

async function analyzeInput(input: string, openAIKey: string) {
  const spinner = ora('Analyzing content...').start();
  
  try {
    const result = await skaim(input, openAIKey);
    spinner.succeed('Analysis complete');
    
    console.log(chalk.green.bold('\n📝 Summary:'));
    console.log(result.summary);
    
    // Prompt user to select a link
    const { selectedLink } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedLink',
        message: '\n\nSelect a link to analyze:',
        choices: [
          ...result.links.map(link => ({
            name: `${chalk.bold(link.name)}: ${chalk.cyan(link.url)}`,
            value: link.url
          })),
          { name: 'Exit', value: 'exit' }
        ]
      }
    ]);

    if (selectedLink && selectedLink !== 'exit') {
      await analyzeInput(selectedLink, openAIKey);
    }

  } catch (error) {
    spinner?.fail('Analysis failed');
    console.error(chalk.red('Error:'), error);
  }
}

main(); 