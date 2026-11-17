// The TypeScript models are the single source of truth. We keep generated
// classic .js checked in so GitHub Pages can run without a build step.
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';

const root = fileURLToPath(new URL('../', import.meta.url));
const verify = process.argv.includes('--check');
const modules = [
  'src/features/tasks/task-model',
  'src/features/notes/note-model'
];

for (const base of modules) {
  const input = join(root, base + '.ts');
  const output = join(root, base + '.js');
  const result = await build({
    entryPoints: [input],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    target: 'es2022',
    charset: 'utf8',
    legalComments: 'none',
    logLevel: 'silent'
  });
  const compiled = result.outputFiles[0]?.text;
  if (!compiled) throw new Error('No JavaScript generated for ' + input);
  if (verify) {
    const checkedIn = await readFile(output, 'utf8');
    if (checkedIn !== compiled) {
      throw new Error(base + '.js differs from TypeScript output; run npm run generate:models and commit the changes');
    }
    console.log('Verified TS -> JS: ' + base);
  } else {
    await writeFile(output, compiled);
    console.log('Generated ' + base + '.js');
  }
}
