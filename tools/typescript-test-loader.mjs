import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const modules = new Map();
export async function moduleUrl(url) {
  if (modules.has(url.href)) return modules.get(url.href);
  let source = ts.transpileModule(await readFile(url, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, experimentalDecorators: true } }).outputText;
  for (const match of [...source.matchAll(/(?:from\s+|import\s*)['"]([^'"]+)['"]/g)]) {
    const specifier = match[1];
    const resolved = specifier.startsWith('.') ? await moduleUrl(new URL(specifier + '.ts', url)) : import.meta.resolve(specifier);
    source = source.replaceAll(`'${specifier}'`, `'${resolved}'`).replaceAll(`"${specifier}"`, `"${resolved}"`);
  }
  const value = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  modules.set(url.href, value);
  return value;
}
