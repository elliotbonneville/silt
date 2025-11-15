# E2E Tests with Playwright

Tests the actual React UI with real multiplayer scenarios using the Page Object Model pattern.

## Setup (One Time)

```bash
# Install Playwright and browsers
npm install
npx playwright install chromium
```

## Running Tests

### Automated (Recommended)
```bash
npm run test:e2e
```

This automatically:
1. Starts server on port 3000
2. Starts client on port 5173  
3. Runs all E2E tests
4. Shows detailed logs of every player action and event
5. Shuts down when done

### Interactive UI Mode
```bash
npm run test:e2e:ui
```

Opens Playwright's UI to:
- Watch tests run live
- Debug failures  
- See screenshots/videos
- Time-travel through test execution

## What You'll See

The tests log everything both players see:

```
🧪 TEST: Public chat (say)...

  [Alice] 🌍 Opened game page
  [Bob] 🌍 Opened game page  
  [Alice] 🎮 Joining game as "Alice"
  [Alice] ✅ Joined successfully
  [Bob] 🎮 Joining game as "Bob"
  [Bob] ✅ Joined successfully
  [Alice] 👀 Saw: "Bob has entered"
  [Alice] 💬 > say Hello Bob!
  [Alice] 📺 Alice says: "Hello Bob!"
  [Bob] 📺 Alice says: "Hello Bob!"
  [Alice] ✓ Checking for: "Alice says: "Hello Bob!""
  [Bob] ✓ Checking for: "Alice says: "Hello Bob!""
```

This lets you verify:
- ✅ Message wording is correct
- ✅ Both players see the same thing
- ✅ Events arrive in correct order
- ✅ No weird transformations

## Architecture

### Page Object Model

Tests use the `GamePageDriver` class (`game-page.driver.ts`) which encapsulates all UI interactions:

- **Separation of Concerns** - Test logic separated from UI selectors
- **Reusability** - All tests use the same driver methods
- **Maintainability** - UI changes only require updating the driver
- **Readability** - High-level test methods like `joinGame()`, `sendCommand()`

Example usage:
```typescript
const alice = new GamePageDriver(await context.newPage(), 'Alice');
await alice.goto();
await alice.joinGame();
await alice.sendCommand('look');
expect(await alice.hasText('Town Square')).toBe(true);
```

## Tests Included

1. **Connection** - Two players connect and see each other
2. **Privacy** - Look command stays private
3. **Chat** - Say broadcasts to all in room
4. **Movement** - Movement events broadcast correctly
5. **Isolation** - Chat doesn't leak between rooms
6. **Range** - Shouts propagate across rooms

## Debugging

### Run single test
```bash
npx playwright test --grep "should keep look command private"
```

### Run with headed browser (see the UI)
```bash
npx playwright test --headed
```

### Debug mode
```bash
npx playwright test --debug
```

---

🎭 Playwright tests the **real user experience** - what players actually see!

