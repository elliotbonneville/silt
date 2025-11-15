import { readFileSync } from 'node:fs';
import { glob } from 'glob';

const MAX_LINES = 300;
const files = glob.sync('packages/**/src/**/*.{ts,tsx}');

const violations = [];

for (const file of files) {
  const content = readFileSync(file, 'utf-8');
  const lines = content.split('\n').length;

  if (lines > MAX_LINES) {
    violations.push({ file, lines });
  }
}

if (violations.length > 0) {
  console.error('❌ File size violations:');
  for (const v of violations) {
    console.error(`  ${v.file}: ${v.lines} lines (max ${MAX_LINES})`);
  }
  process.exit(1);
}

// Script output, not debug logging
// biome-ignore lint/suspicious/noConsoleLog: Script needs to output success message
console.log('✅ All files under 300 lines');
