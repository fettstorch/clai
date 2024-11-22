#!/usr/bin/env bun
import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { skaim } from './index';

const program = new Command();

async function analyzeInput(input: string, openAIKey: string) {
  const spinner = ora('Analyzing...').start();
  try {
    const result = await skaim(input, openAIKey);
    spinner.succeed('Analysis complete');
    
    console.log(chalk.green('\n📝 Summary:'));
    console.log(result.summary);
    
    console.log(chalk.yellow('\n🔗 Extracted Links:'));
    result.links.forEach(link => {
      console.log(`${chalk.bold('•')} ${chalk.cyan(link.name)}: ${link.url}`);
    });

    // Prompt user to select a link
    const { selectedLink } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedLink',
        message: 'Select a link to analyze (or press Ctrl+C to exit):',
        choices: [
          ...result.links.map(link => ({
            name: `${link.name}: ${link.url}`,
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

async function main() {
  try {
    program
      .name('skaim')
      .description('AI-powered web scraping tool')
      .version('1.0.0')
      .argument('[url]', 'URL to analyze')
      .option('-i, --interactive', 'Run in interactive mode')
      .action(async (url: string, options) => {
        const openAIKey = process.env.OPENAI_API_KEY;
        
        if (!openAIKey) {
          console.error(chalk.red('❌ OPENAI_API_KEY environment variable is not set'));
          process.exit(1);
        }

        if (options.interactive || !url) {
          const answers = await inquirer.prompt([
            {
              type: 'input',
              name: 'url',
              message: 'Enter a URL or search query (google):',
              default: url,
              validate: (input) => input.length > 0
            }
          ]);
          url = answers.url;
        }

        await analyzeInput(url, openAIKey);
        process.exit(0);
      });

    await program.parseAsync();
  } catch (error) {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  }
}

main(); 