// Reuse the installed backend ESLint/TypeScript parser without changing dependencies.
import { createRequire } from 'node:module';
const require = createRequire(new URL('../backend/package.json', import.meta.url));
const { ESLint } = require('eslint');
const parser = require('@typescript-eslint/parser');
const plugin = require('@typescript-eslint/eslint-plugin');
const lint = new ESLint({ overrideConfigFile: true, overrideConfig: [{
  files: ['**/*.ts'], languageOptions: { parser, parserOptions: { sourceType: 'module' } },
  plugins: { '@typescript-eslint': plugin }, rules: { ...plugin.configs.recommended.rules }
}] });
const results = await lint.lintFiles([
  'src/app/core/shop/*.ts', 'src/app/core/api/public-shop-api.service.ts',
  'src/app/pages/shop/*.ts', 'src/app/shared/shop/*.ts',
  'src/app/core/api/checkout-api.service.ts', 'src/app/core/interceptors/auth.interceptor.ts',
  'src/app/admin/pages/shop/**/*.ts', 'src/app/admin/admin.routes.ts',
  'src/app/app.routes.server.ts', 'src/app/app.config.server.ts', 'src/app/app.component.ts', 'src/app/core/seo/seo.service.ts',
  'src/app/layout/header/header.component.ts', 'src/app/pages/home/home.component.ts', 'src/app/app.routes.ts'
]);
process.stdout.write(await (await lint.loadFormatter('stylish')).format(results));
const errors = results.reduce((count, result) => count + result.errorCount, 0);
console.log(`Shop frontend lint: ${results.length} files, ${errors} errors.`);
process.exitCode = errors ? 1 : 0;
