#!/usr/bin/env bun
import { when } from "@fettstorch/jule";
import chalk from "chalk";
import { Command } from "commander";
import inquirer from "inquirer";
import ora from "ora";
import pkg from "../package.json" assert { type: "json" };
import { clai } from "./index";
import { version } from "../package.json";

const program = new Command();

async function main() {
  console.log(`[clAi]::${chalk.cyan(version)}`);
  try {
    program
      .name("clai")
      .description("AI-powered web scraping tool")
      .version(pkg.version)
      .argument("[input...]", "URL or search terms to analyze")
      .action(async (inputs: string[]) => {
        const openAIKey = process.env.OPENAI_API_KEY;

        if (!openAIKey) {
          console.error(
            chalk.red(`${String.fromCodePoint(0x274c)} OPENAI_API_KEY environment variable is not set`)
          );
          process.exit(1);
        }

        let input = inputs?.join(" ");

        if (!input) {
          const answers = await inquirer.prompt([
            {
              type: "input",
              name: "input",
              message: "Enter a URL or search query:",
              validate: (input) => input.length > 0,
            },
          ]);
          input = answers.input;
        }

        await analyzeInput(input, openAIKey);
        process.exit(0);
      });

    await program.parseAsync();
  } catch (error) {
    console.error(chalk.red("Fatal error:"), error);
    process.exit(1);
  }
}

async function animateText(text: string, delay = 25) {
  let shouldComplete = false;

  // Setup keypress listener
  const keypressHandler = (str: string, key: { name: string }) => {
    if (key.name === "return") {
      shouldComplete = true;
    }
  };

  process.stdin.on("keypress", keypressHandler);

  // Enable raw mode to get keypress events
  process.stdin.setRawMode(true);
  process.stdin.resume();

  // Small delay to ensure stdin is ready for keypress capture
  // This fixes the issue where the first animation can't be interrupted
  await new Promise(resolve => setTimeout(resolve, 50));

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
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Cleanup
  process.stdin.setRawMode(false);
  process.stdin.pause();
  process.stdin.removeListener("keypress", keypressHandler);

  process.stdout.write("\n");
}

function formatMarkdownForTerminal(text: string): string {
  // Handle headings first
  const headingHandled = text.replace(
    /^(#{1,3})\s+(.*?)$/gm,
    (_, hashes, content) =>
      when(hashes.length)({
        1: () =>
          `\n${chalk.yellow.bold("═══ ")}${chalk.yellow.bold(
            content
          )}${chalk.yellow.bold(" ═══")}`,
        2: () => chalk.yellowBright.bold(content),
        3: () => chalk.yellow(content),
        else: () => content,
      })
  );

  // Handle regular bold text after headings
  const boldHandled = headingHandled.replace(/\*\*(.*?)\*\*/g, (_, content) =>
    chalk.bold(content)
  );

  return boldHandled;
}

async function analyzeInput(input: string, openAIKey: string) {
  const spinner = ora({
    text: "Thinking...",
    spinner: {
      frames: [
        String.fromCodePoint(0x2819), // ⠙
        String.fromCodePoint(0x2839), // ⠹
        String.fromCodePoint(0x2838), // ⠸
        String.fromCodePoint(0x2826), // ⠦
        String.fromCodePoint(0x2807), // ⠧
        String.fromCodePoint(0x280F), // ⠏
        String.fromCodePoint(0x281F), // ⠟
        String.fromCodePoint(0x283F), // ⠿
      ],
      interval: 80
    }
  }).start();

  try {
    const result = await clai(input, openAIKey);
    spinner.stop();
    console.log(`${String.fromCodePoint(0x2705)} AHA!`);

    console.log(chalk.green.bold(`\n${String.fromCodePoint(0x1f4dd)} ═══ Summary ═══ :`));
    const formattedContent = formatMarkdownForTerminal(result.summary);
    await animateText(formattedContent);

    // Prompt user to select a link
    const { selectedLink } = await inquirer.prompt([
      {
        type: "list",
        name: "selectedLink",
        message: "\n\nWhat now?:",
        choices: [
          { name: chalk.yellow(`${String.fromCodePoint(0x1f50d)} New search`), value: "new" },
          ...result.links.map((link) => ({
            name: `${chalk.bold(link.name)}: ${chalk.cyan(link.url)}`,
            value: link.url,
          })),
          { name: "Exit", value: "exit" },
        ],
      },
    ]);

    if (selectedLink === "new") {
      const { input: newInput } = await inquirer.prompt([
        {
          type: "input",
          name: "input",
          message: "Enter a URL or search query:",
          validate: (input) => input.length > 0,
        },
      ]);
      await analyzeInput(newInput, openAIKey);
    } else if (selectedLink && selectedLink !== "exit") {
      await analyzeInput(selectedLink, openAIKey);
    }
  } catch (error) {
    spinner?.stop();
    console.log(`${String.fromCodePoint(0x274c)} Analysis failed`);
    console.error(chalk.red("Error:"), error);
  }
}

main();
