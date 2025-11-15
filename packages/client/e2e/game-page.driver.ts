/**
 * Page Object Model for the MUD game client
 * Encapsulates all UI interactions for E2E tests
 */

import type { Page } from '@playwright/test';

const WAIT_FOR_EVENT = 100; // ms for event propagation
const DEFAULT_TIMEOUT = 2000;
const JOIN_TIMEOUT = 5000;

/**
 * Game page driver for E2E testing
 * Provides high-level methods for interacting with the game UI
 */
export class GamePageDriver {
  private readonly playerName: string;

  constructor(
    public readonly page: Page,
    playerName: string,
  ) {
    this.playerName = playerName;
    this.setupLogging();
  }

  /**
   * Set up console logging to capture game events
   */
  private setupLogging(): void {
    this.page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('game:event') || text.includes('Connected to server')) {
        console.log(`  [${this.playerName}] 🌐 ${text}`);
      }
    });
  }

  /**
   * Navigate to the game client
   */
  async goto(): Promise<void> {
    await this.page.goto('http://localhost:5173');
    console.log(`  [${this.playerName}] 🌍 Opened game page`);
  }

  /**
   * Join the game with the player's name
   */
  async joinGame(): Promise<void> {
    console.log(`  [${this.playerName}] 🎮 Joining game as "${this.playerName}"`);
    await this.page.fill('input[type="text"]', this.playerName);
    await this.page.click('button:has-text("Enter Game")');
    await this.page.waitForSelector('div.font-mono.text-green-400', {
      timeout: JOIN_TIMEOUT,
    });
    console.log(`  [${this.playerName}] ✅ Joined successfully`);
  }

  /**
   * Send a command to the game and log the response
   */
  async sendCommand(command: string): Promise<void> {
    console.log(`  [${this.playerName}] 💬 > ${command}`);
    await this.page.fill('input[placeholder*="Enter command"]', command);
    await this.page.press('input[placeholder*="Enter command"]', 'Enter');

    // Log what appeared in terminal after command
    await new Promise((r) => setTimeout(r, WAIT_FOR_EVENT));
    const terminalText = await this.getTerminalText();
    const lines = terminalText.split('\n').slice(-5); // Last 5 lines
    for (const line of lines) {
      if (line.trim()) {
        console.log(`  [${this.playerName}] 📺 ${line.trim()}`);
      }
    }
  }

  /**
   * Get all text from the game terminal
   */
  async getTerminalText(): Promise<string> {
    const terminal = this.page.locator('div.font-mono.text-green-400').first();
    return (await terminal.textContent()) || '';
  }

  /**
   * Wait for specific text to appear in the terminal
   */
  async waitForText(text: string, timeout = DEFAULT_TIMEOUT): Promise<void> {
    await this.page.locator(`text=${text}`).waitFor({ timeout });
    console.log(`  [${this.playerName}] 👀 Saw: "${text}"`);
  }

  /**
   * Check if text is present in the terminal
   */
  async hasText(text: string): Promise<boolean> {
    const terminalText = await this.getTerminalText();
    const found = terminalText.includes(text);
    console.log(`  [${this.playerName}] ${found ? '✓' : '✗'} Checking for: "${text}"`);
    return found;
  }

  /**
   * Get the player's name
   */
  getPlayerName(): string {
    return this.playerName;
  }

  /**
   * Wait for event propagation (useful between actions)
   */
  async waitForEventPropagation(): Promise<void> {
    await new Promise((r) => setTimeout(r, WAIT_FOR_EVENT));
  }

  /**
   * Close the page context
   */
  async close(): Promise<void> {
    await this.page.context().close();
  }
}
