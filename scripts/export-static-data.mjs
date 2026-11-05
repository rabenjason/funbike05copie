#!/usr/bin/env node
/**
 * Evaluates the existing TypeScript data modules without editing them and emits
 * a deterministic JSON snapshot for the PHP migration CLI. Requires the repo's
 * existing TypeScript devDependency. This script does not write into src/data.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const ts = require('typescript');
const cache = new Map();

function resolveTs(from, request) {
  const base = path.resolve(path.dirname(from), request);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  throw new Error(`Cannot resolve TypeScript data dependency ${request} from ${from}`);
}

function loadTs(filename) {
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} };
  cache.set(filename, module);
  const source = fs.readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      resolveJsonModule: true,
    },
  }).outputText;
  const localRequire = (request) => request.startsWith('.')
    ? loadTs(resolveTs(filename, request))
    : require(request);
  new Function('require', 'module', 'exports', '__filename', '__dirname', compiled)(
    localRequire, module, module.exports, filename, path.dirname(filename),
  );
  return module.exports;
}

const data = loadTs(path.join(root, 'src/data/index.ts'));
const dealers = loadTs(path.join(root, 'src/data/dealers.ts'));
const contact = loadTs(path.join(root, 'src/data/contact.ts'));
const homepage = loadTs(path.join(root, 'src/data/homepage.ts'));
const brandsModule = loadTs(path.join(root, 'src/data/brands.ts'));
const inputFiles = [
  ...[...fs.readdirSync(path.join(root, 'src/data'), { recursive: true })]
    .filter((name) => String(name).endsWith('.ts'))
    .map((name) => path.join(root, 'src/data', String(name))),
  // The Sherco banner image is currently embedded in a visual component rather than src/data.
  path.join(root, 'src/components/ShercoBanner.tsx'),
].sort();
const shercoBannerSource = fs.readFileSync(path.join(root, 'src/components/ShercoBanner.tsx'), 'utf8');
const shercoBannerMatch = shercoBannerSource.match(/src="(https?:\/\/[^\"]+)"/);
if (!shercoBannerMatch) throw new Error('Could not find the current Sherco banner image URL.');
const hash = crypto.createHash('sha256');
for (const file of inputFiles) {
  hash.update(path.relative(root, file));
  hash.update('\0');
  hash.update(fs.readFileSync(file));
  hash.update('\0');
}

const manifest = {
  manifestVersion: 1,
  sourceHash: hash.digest('hex'),
  sourceFiles: inputFiles.map((file) => path.relative(root, file).replaceAll(path.sep, '/')),
  data: {
    products: data.products,
    brands: data.brands,
    categories: data.categories,
    productTypes: data.productTypes,
    models: data.models,
    promotions: data.promotions,
    blog: [],
    homepage: {
      ...homepage.homepage,
      sherco: { ...homepage.homepage.sherco, bannerImageUrl: shercoBannerMatch[1] },
      homepageCategories: homepage.homepageCategories,
      exclusiveBrands: homepage.homepageExclusiveBrands,
    },
    dealers: dealers.DEALERS,
    contact: Object.fromEntries(Object.entries(contact).filter(([, value]) => typeof value !== 'function')),
    site: { logoUrl: brandsModule.LOGO },
  },
};

const output = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(root, 'server/storage/.migration-source.json');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'w' });
console.log(`Static data snapshot prepared at ${path.relative(root, output)} (source ${manifest.sourceHash}).`);
console.log('No data was imported and no image was downloaded.');
