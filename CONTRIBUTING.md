# Contributing to Silt

## Quick Start

```bash
# Clone and setup
git clone git@github.com:elliotbonneville/silt.git
cd silt
npm install
cp env.example .env

# Start development servers
npm run dev

# Open browser
# http://localhost:5173 (client)
# http://localhost:3000 (server API)
```

## Development Workflow

### Daily Workflow

```bash
# Pull latest
git pull

# Create feature branch (optional for solo dev)
git checkout -b feat/add-combat

# Make changes (keep files under 300 lines!)
# Write tests as you go

# Validate before committing
npm run check-all

# Commit (pre-commit hook runs automatically)
git commit -m "feat(combat): add damage calculation"

# Push
git push origin main
```

### Validation Commands

```bash
npm run lint              # Biome linting
npm run lint:fix          # Auto-fix linting issues
npm run format            # Format all files
npm run type-check        # TypeScript compilation
npm test                  # Run all tests
npm run test:coverage     # Tests with coverage report
npm run check-file-size   # Verify all files under 300 lines
npm run check-unused-exports  # Find dead code
npm run check-all         # Run everything
```

**Pre-commit hook runs all of these automatically.**

## Code Standards

### The Rules (Zero Exceptions)

1. **No `any`, `as`, `!`, `@ts-ignore`** - Use type narrowing
2. **No dynamic imports** (`await import()` or `import()`) - Use static imports at the top of files
3. **300 line maximum** per file - Split when approaching 250
4. **80% test coverage** minimum - 95% on critical paths
5. **Small commits** - 50-100 lines ideal, 200 max
6. **Biome only** - No ESLint, no Prettier

See `.cursor/rules/main.mdc` for complete standards.

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring
- `test`: Adding tests
- `docs`: Documentation
- `build`: Build system/tooling
- `chore`: Maintenance

**Examples:**
```
feat(combat): add damage calculation with defense
fix(movement): prevent moving to non-existent rooms  
refactor(events): extract propagation to separate module
test(combat): add edge cases for zero damage
docs(architecture): add event system explanation
```

## Adding Features

### Step-by-Step Process

**1. Plan Module Structure**
- Sketch out files (each under 300 lines)
- Identify shared types
- Plan test coverage

**2. Add Types to Shared (if needed)**
```bash
# Example: Adding item types
packages/shared/src/types/items.ts  # < 100 lines
```

**3. Implement Core Logic**
```bash
# Example: Combat system
packages/server/src/game/combat/
  damage-calculator.ts       # Pure function (50 lines)
  damage-calculator.test.ts  # Tests (50 lines)
  combat-validator.ts        # Validation (70 lines)
  combat-validator.test.ts   # Tests (60 lines)
```

**4. Commit After Each Module**
```bash
git add packages/server/src/game/combat/damage-calculator.ts
git add packages/server/src/game/combat/damage-calculator.test.ts
git commit -m "feat(combat): add damage calculation"
# 100 lines committed

git add packages/server/src/game/combat/combat-validator.ts
git add packages/server/src/game/combat/combat-validator.test.ts
git commit -m "feat(combat): add combat validation"
# 130 lines committed
```

**5. Integrate with Event System**
```bash
# Wire combat into engine
git commit -m "feat(combat): integrate with event system"
# 80 lines committed
```

### Writing Tests

**Co-locate tests:**
```
feature.ts
feature.test.ts
```

**Test naming:**
```typescript
describe('calculateDamage', () => {
  it('should deal minimum 1 damage when defense exceeds attack', () => {
    // Arrange
    const attacker = { attackPower: 5 };
    const defender = { defense: 100 };
    
    // Act
    const damage = calculateDamage(attacker, defender);
    
    // Assert
    expect(damage).toBe(1);
  });
  
  it('should calculate damage as attack minus defense', () => {
    const attacker = { attackPower: 20 };
    const defender = { defense: 8 };
    
    expect(calculateDamage(attacker, defender)).toBe(12);
  });
  
  it('should handle zero attack power', () => {
    const attacker = { attackPower: 0 };
    const defender = { defense: 5 };
    
    expect(calculateDamage(attacker, defender)).toBe(1);  // Min damage
  });
});
```

### When Files Get Large

**At 250 lines:** Plan refactor
**At 300 lines:** STOP immediately

**Refactoring strategies:**

**Extract functions:**
```typescript
// Before: game-engine.ts (320 lines)
class GameEngine {
  // 30 methods...
}

// After: Split responsibilities
game-engine.ts (180 lines) - orchestration
combat-handler.ts (90 lines) - combat logic  
movement-handler.ts (70 lines) - movement logic
```

**Extract to subdirectories:**
```
game/
  combat/
    combat-system.ts
    damage-calculator.ts
    combat-validator.ts
  movement/
    movement-system.ts
    exit-resolver.ts
```

## Troubleshooting

### TypeScript Can't Find `@silt/shared`

**Problem:** Path mappings not resolving

**Solution:** Check `tsconfig.json`:
```json
{
  "baseUrl": "../..",
  "paths": {
    "@silt/shared": ["packages/shared/src/index.ts"]
  }
}
```

Restart TypeScript server in editor.

### Pre-Commit Hook Not Running

```bash
# Verify hook exists
ls -la .husky/pre-commit

# Verify it's executable  
chmod +x .husky/pre-commit

# Verify git config
git config core.hooksPath
# Should output: .husky
```

### Tests Failing

```bash
# Run specific test file
npm test packages/server/src/game/world.test.ts

# Run with verbose output
npm test -- --reporter=verbose

# Run in watch mode
npm test -- --watch
```

### Biome Errors

```bash
# Auto-fix most issues
npm run lint:fix

# Check specific file
npx biome check path/to/file.ts

# Format specific file
npx biome format --write path/to/file.ts
```

## Common Questions

### Q: Can I use `any` just this once?
**A: No.** Use `unknown` and narrow:
```typescript
function process(value: unknown) {
  if (typeof value === 'string') {
    return value.toUpperCase();
  }
  throw new Error('Expected string');
}
```

### Q: Can I use dynamic imports to avoid circular dependencies?
**A: No.** Refactor your module structure instead. Use dependency injection, extract shared types to a separate file, or restructure your imports. Dynamic imports make code harder to analyze and can hide circular dependency issues that should be fixed at the architecture level.

### Q: My file is approaching 300 lines. What do I do?
**A: Stop and refactor immediately.** Extract functions, create new modules, split responsibilities. This is non-negotiable.

### Q: Can I commit 500 lines at once if it's one feature?
**A: No.** Break it into 3-5 commits. Implement incrementally. Commit after each piece + tests.

### Q: Do I need tests for every file?
**A: Yes, except:**
- Type definition files
- Configuration files
- Simple data models with no logic

### Q: Can I skip the pre-commit hook in an emergency?
**A: No.** Fix the errors. The hook exists to prevent emergencies, not cause them.

### Q: Where should I add new types?
**A: If both client and server need it:** `packages/shared/src/types/`
**A: If only server needs it:** `packages/server/src/game/`

### Q: How do I add a new command?
**A: Add to command parser** → **Write tests** → **Integrate with event system** → **Commit** (3 small commits, not 1 large).

### Q: Event system seems complicated. Can I bypass it?
**A: No.** The event system is the foundation. Everything goes through events. No exceptions.

## Getting Help

1. Read `ARCHITECTURE.md` for core concepts
2. Read `PLAN.md` for overall vision
3. Check `.cursor/rules/main.mdc` for code standards
4. Look at existing code for patterns
5. Ask in discussion thread

## Remember

> "The only way to go fast is to go well."

These rules exist because we're building something complex with permadeath, AI, and real-time multiplayer. One bug can corrupt character data permanently or crash the server. 

**The restrictions enable success, not prevent it.**

