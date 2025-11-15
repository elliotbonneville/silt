# API Generation Workflow

## Single Source of Truth: Prisma → Zod → OpenAPI → Client

Our API has a fully type-safe pipeline from database to client:

```
┌─────────────┐
│   Prisma    │  ← Source of Truth (database schema)
│   Schema    │
└──────┬──────┘
       │
       │ (prisma generate + zod-prisma-types)
       ↓
┌─────────────┐
│     Zod     │  ← Auto-generated validation schemas
│   Schemas   │
└──────┬──────┘
       │
       │ (npm run openapi:generate)
       ↓
┌─────────────┐
│   OpenAPI   │  ← Auto-generated API spec
│    Spec     │
└──────┬──────┘
       │
       │ (manual, but type-safe)
       ↓
┌─────────────┐
│   Client    │  ← Hand-written, uses types from server
│     API     │
└─────────────┘
```

## Workflow

### 1. Update Database Schema

Edit `packages/server/prisma/schema.prisma`

### 2. Generate Zod Schemas

```bash
cd packages/server
npm run db:generate
```

This generates:
- Prisma Client → `node_modules/@prisma/client`
- Zod Schemas → `src/database/generated/index.ts`

### 3. Generate OpenAPI Spec (Optional)

```bash
cd packages/server
npm run openapi:generate
```

This generates: `openapi.json` from Zod schemas

### 4. Update API Routes

Update `src/api/character-routes.ts` to use the generated Zod schemas for validation

### 5. Update Client

Update `packages/client/src/api/client.ts` manually (it's simple and type-safe)

## Key Files

- **Source:** `packages/server/prisma/schema.prisma`
- **Generated Zod:** `packages/server/src/database/generated/index.ts` (gitignored)
- **Generated OpenAPI:** `packages/server/openapi.json` (gitignored)
- **API Routes:** `packages/server/src/api/character-routes.ts`
- **Client API:** `packages/client/src/api/client.ts` (hand-written, ~80 lines)

## Why Hand-Written Client?

- Simple and maintainable (~80 lines)
- Fully type-safe
- No code generation complexity
- Easy to customize
- Works with our strict TypeScript settings

Auto-generation (Kubb) can be added later when tooling matures.

