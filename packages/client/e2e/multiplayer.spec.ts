/**
 * E2E tests for multiplayer functionality using Playwright
 * Tests the actual UI and real-time interactions
 */

import { expect, test } from '@playwright/test';
import { GamePageDriver } from './game-page.driver';

const WAIT_FOR_EVENT = 100; // ms for event propagation

test('should allow two players to connect and see each other', async ({ browser }) => {
  const aliceContext = await browser.newContext();
  const bobContext = await browser.newContext();

  const alicePage = new GamePageDriver(await aliceContext.newPage(), 'Alice');
  const bobPage = new GamePageDriver(await bobContext.newPage(), 'Bob');

  await alicePage.goto();
  await bobPage.goto();

  await alicePage.joinGame();
  await bobPage.joinGame();

  // Alice should see Bob join
  await alicePage.waitForText('Bob has entered the room');
  expect(await alicePage.hasText('Bob has entered the room')).toBe(true);

  await aliceContext.close();
  await bobContext.close();
});

test('should keep look command private', async ({ browser }) => {
  const aliceContext = await browser.newContext();
  const bobContext = await browser.newContext();

  const alicePage = new GamePageDriver(await aliceContext.newPage(), 'Alice');
  const bobPage = new GamePageDriver(await bobContext.newPage(), 'Bob');

  await alicePage.goto();
  await bobPage.goto();

  await alicePage.joinGame();
  await bobPage.joinGame();

  await alicePage.waitForText('Bob has entered');
  await new Promise((r) => setTimeout(r, WAIT_FOR_EVENT));

  // Get Bob's terminal content before Alice looks
  const bobTerminalBefore = await bobPage.getTerminalText();
  const bobLineCountBefore = bobTerminalBefore.split('\n').length;

  // Alice looks around
  await alicePage.sendCommand('look');
  await new Promise((r) => setTimeout(r, WAIT_FOR_EVENT));

  // Alice should see room description in her terminal
  expect(await alicePage.hasText('Town Square')).toBe(true);
  expect(await alicePage.hasText('A bustling town square')).toBe(true);

  // Bob's terminal should NOT have changed (no new output from Alice's look)
  const bobTerminalAfter = await bobPage.getTerminalText();
  const bobLineCountAfter = bobTerminalAfter.split('\n').length;
  expect(bobLineCountAfter).toBe(bobLineCountBefore);

  await aliceContext.close();
  await bobContext.close();
});

test('should broadcast chat to all players in room', async ({ browser }) => {
  console.log('\n🧪 TEST: Public chat (say)...\n');

  const aliceContext = await browser.newContext();
  const bobContext = await browser.newContext();

  const alicePage = new GamePageDriver(await aliceContext.newPage(), 'Alice');
  const bobPage = new GamePageDriver(await bobContext.newPage(), 'Bob');

  await alicePage.goto();
  await bobPage.goto();

  await alicePage.joinGame();
  await bobPage.joinGame();

  await alicePage.waitForText('Bob has entered');

  // Alice says something
  await alicePage.sendCommand('say Hello Bob!');
  await new Promise((r) => setTimeout(r, WAIT_FOR_EVENT));

  // Both should see the message
  expect(await alicePage.hasText('Alice says: "Hello Bob!"')).toBe(true);
  expect(await bobPage.hasText('Alice says: "Hello Bob!"')).toBe(true);

  await aliceContext.close();
  await bobContext.close();
});

test('should broadcast movement events', async ({ browser }) => {
  console.log('\n🧪 TEST: Movement broadcasts...\n');

  const aliceContext = await browser.newContext();
  const bobContext = await browser.newContext();

  const alicePage = new GamePageDriver(await aliceContext.newPage(), 'Alice');
  const bobPage = new GamePageDriver(await bobContext.newPage(), 'Bob');

  await alicePage.goto();
  await bobPage.goto();

  await alicePage.joinGame();
  await bobPage.joinGame();

  await alicePage.waitForText('Bob has entered');

  // Alice moves north
  await alicePage.sendCommand('go north');
  await new Promise((r) => setTimeout(r, WAIT_FOR_EVENT));

  // Bob should see Alice move
  expect(await bobPage.hasText('Alice moves north')).toBe(true);

  await aliceContext.close();
  await bobContext.close();
});

test('should isolate chat between rooms', async ({ browser }) => {
  console.log('\n🧪 TEST: Room isolation (chat)...\n');

  const aliceContext = await browser.newContext();
  const bobContext = await browser.newContext();

  const alicePage = new GamePageDriver(await aliceContext.newPage(), 'Alice');
  const bobPage = new GamePageDriver(await bobContext.newPage(), 'Bob');

  await alicePage.goto();
  await bobPage.goto();

  await alicePage.joinGame();
  await bobPage.joinGame();

  await alicePage.waitForText('Bob has entered');

  // Alice moves to different room
  await alicePage.sendCommand('go north');
  await new Promise((r) => setTimeout(r, WAIT_FOR_EVENT));

  // Alice says something
  await alicePage.sendCommand('say Bob should not hear this');
  await new Promise((r) => setTimeout(r, WAIT_FOR_EVENT));

  // Bob should NOT see Alice's message
  expect(await bobPage.hasText('Bob should not hear this')).toBe(false);

  await aliceContext.close();
  await bobContext.close();
});

test('should propagate shouts across rooms', async ({ browser }) => {
  console.log('\n🧪 TEST: Range-based events (shout)...\n');

  const aliceContext = await browser.newContext();
  const bobContext = await browser.newContext();

  const alicePage = new GamePageDriver(await aliceContext.newPage(), 'Alice');
  const bobPage = new GamePageDriver(await bobContext.newPage(), 'Bob');

  await alicePage.goto();
  await bobPage.goto();

  await alicePage.joinGame();
  await bobPage.joinGame();

  await alicePage.waitForText('Bob has entered');

  // Alice moves to Forest (1 room away)
  await alicePage.sendCommand('go north');
  await new Promise((r) => setTimeout(r, WAIT_FOR_EVENT));

  // Alice shouts
  await alicePage.sendCommand('shout Can you hear me?');
  await new Promise((r) => setTimeout(r, WAIT_FOR_EVENT * 2));

  // Bob should hear the shout
  expect(await bobPage.hasText('Alice shouts: "Can you hear me?"')).toBe(true);

  await aliceContext.close();
  await bobContext.close();
});
