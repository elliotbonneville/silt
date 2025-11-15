# Silt - Modern MUD with AI Agents

A real-time, multiplayer text-based game with intelligent AI NPCs, permanent character death, and dynamic world building.

## Project Structure

```
silt/
├── packages/
│   ├── server/       # Game engine + API (Express + Socket.io)
│   ├── client/       # React UI (Vite + React Router v7)
│   └── shared/       # Shared types and constants
├── scripts/          # Build and validation scripts
└── PLAN.md           # Comprehensive architecture and development plan
```

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment variables
cp env.example .env

# Run development servers (client + server)
npm run dev

# Or run individually
npm run dev:server  # Server on http://localhost:3000
npm run dev:client  # Client on http://localhost:5173
```

## Development

### Code Standards
- **TypeScript strict mode** - No `any`, `as`, or `!` allowed
- **300 line maximum** per file - Enforced by pre-commit hook
- **Biome** for linting and formatting (not ESLint/Prettier)
- **80% test coverage** minimum - 95% on critical paths

See `.cursor/rules/main.mdc` for complete standards.

### Testing

```bash
npm test                # Run all tests
npm run test:coverage   # With coverage report
```

### Linting

```bash
npm run lint           # Check for issues
npm run lint:fix       # Auto-fix issues
npm run format         # Format all files
```

### Pre-Commit Hooks

Automatically runs on every commit:
- Biome linting
- TypeScript compilation
- Related tests
- File size check

## Documentation

**Start here:**
1. **[docs/DESIGN_PHILOSOPHY.md](docs/DESIGN_PHILOSOPHY.md)** - Why we build this way (read first!)
2. **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - How the system works
3. **[docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)** - Development workflow and commit guidelines
4. **[docs/PLAN.md](docs/PLAN.md)** - Complete roadmap and iterations
5. **[.cursor/rules/main.mdc](.cursor/rules/main.mdc)** - Code standards (enforced by tooling)

**New developers: Read in order 1 → 2 → 3.**

## Architecture Highlights

- **Actor-based event propagation** - Events reach players and AI agents based on distance
- **Range-based broadcasting** - Hear combat from adjacent rooms, shouts from 3 rooms away
- **Client-agnostic game engine** - Supports text player UI and visual admin UI
- **AI agents as actors** - NPCs hear events and react using same command system as players
- **No build step** - TypeScript path mappings, instant type checking

## Current Iteration

**Iteration 0: Proof of Concept** (In Progress)
- Two players can connect and move between 3 rooms
- Real-time chat and event propagation
- Range-based event system working

## Tech Stack

- **Backend**: Node.js + TypeScript + Express + Socket.io
- **Frontend**: React + Vite + TypeScript + React Router v7
- **Database**: SQLite (dev) → PostgreSQL (production)
- **AI**: OpenAI API (Iteration 3+)
- **Styling**: TailwindCSS

## License

Private project

