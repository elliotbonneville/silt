/**
 * Post-generate script to fix auto-generated Prisma files
 * Adds @ts-nocheck to avoid unused import warnings
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const generatedFile = resolve(__dirname, '../packages/server/src/database/generated/index.ts');

try {
  let content = readFileSync(generatedFile, 'utf-8');

  // Only add if not already present
  if (!content.startsWith('// @ts-nocheck')) {
    content = `// @ts-nocheck - Auto-generated file by zod-prisma-types\n${content}`;
  }

  // Fix unused Prisma import if present
  if (content.includes("import type { Prisma } from '@prisma/client';")) {
    content = content.replace(
      "import type { Prisma } from '@prisma/client';",
      "// import type { Prisma } from '@prisma/client';",
    );
  }

  writeFileSync(generatedFile, content, 'utf-8');
  // biome-ignore lint/suspicious/noConsole: Build script output
  console.log('✅ Fixed generated types (added @ts-nocheck and commented unused imports)');
} catch (error) {
  console.error('Failed to fix generated types:', error);
  process.exit(1);
}
