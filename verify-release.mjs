import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function digest(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

export function safeRelative(value) {
  if (typeof value !== 'string' || !value || value.includes('\\') || value.includes(':') || value.includes('\0')
    || !/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/.test(value)
    || value.startsWith('/') || value.split('/').some(part => !part || part === '.' || part === '..')) {
    throw new Error(`Unsafe package path: ${value}`);
  }
  return value;
}

export function publicPath(value) {
  safeRelative(value);
  if (/(^|\/)(?:strategy|probe|scripts|infra|core|test|raw|reports|research|changes|\.git|\.ssh|\.codex|\.claude|\.aws|node_modules|logs?|runs?|runtime|output|dist|coverage|artifacts?|tmp|vendor|third[-_]?party|opponents?)(\/|$)/i.test(value)
    || /(^|\/)(?:\.env(?:\..*)?|.*(?:dump|private|secret|credential|id_ed25519|id_rsa).*|.*\.(?:jsonl|log)(?:\.(?:gz|gzip|zip|bz2|xz|zst))?)$/i.test(value)
    || (value.split('/').some(part => part.startsWith('.')) && !['.nojekyll', '.gitattributes', '.github/workflows/pages.yml'].includes(value))) {
    throw new Error(`Private or raw asset is not publishable: ${value}`);
  }
  return value;
}

export function validateSourceAsset(asset) {
  publicPath(asset?.path);
  const extension = path.posix.extname(asset.path);
  const types = {
    'teaching-page': ['.html'],
    'teaching-asset': ['.css', '.js', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.woff', '.woff2'],
    'teaching-example': ['.js'],
    reference: ['.md', '.json'],
    'observer-source': ['.mjs'],
  };
  if (!types[asset.kind]?.includes(extension)
    || (/^(?:adapters|build)\//.test(asset.path) !== (asset.kind === 'observer-source'))
    || (/^(?:docs|data)\//.test(asset.path) && asset.kind !== 'reference')
    || (asset.path.startsWith('examples/') && (asset.kind !== 'teaching-example' || !asset.path.startsWith('examples/teaching/')))) {
    throw new Error(`Publication classification does not match source path or file type: ${asset.path}`);
  }
  return asset;
}

export function validatePublicationPolicy(policy) {
  if (policy?.schemaVersion !== 1 || !Array.isArray(policy.files) || !policy.files.length) throw new Error('Invalid publication policy.');
  const approved = new Map();
  for (const asset of policy.files) {
    validateSourceAsset(asset);
    if (approved.has(asset.path) || !/^[a-f0-9]{64}$/.test(asset.sha256 ?? '') || asset.source !== 'project-owned'
      || typeof asset.approvedBy !== 'string' || !asset.approvedBy.trim() || asset.approvedBy.length > 600) {
      throw new Error(`Invalid or duplicate publication approval: ${asset.path}`);
    }
    approved.set(asset.path, asset);
  }
  return approved;
}

const PLATFORM_FILES = new Map([
  ['index.html', true], ['catalog.json', true], ['site.css', true], ['.nojekyll', true], ['publication-policy.json', true],
  ['verify-release.mjs', false], ['.gitattributes', false], ['.github/workflows/pages.yml', false], ['README.md', false],
]);

function validatePublicationMapping(manifest, files) {
  const summary = manifest.publicationPolicy;
  const policyBytes = files.get('publication-policy.json');
  if (!policyBytes || summary?.path !== 'publication-policy.json' || summary.sha256 !== digest(policyBytes)) {
    throw new Error('Publication approval summary mismatch.');
  }
  const approved = validatePublicationPolicy(JSON.parse(policyBytes));
  if (summary.fileCount !== approved.size) throw new Error('Publication approval summary mismatch.');
  const routes = manifest.courses.map(course => `courses/${course.competitionId}/${course.courseId}/${course.editionId}/`);
  for (const entry of manifest.files) {
    if (PLATFORM_FILES.has(entry.path)) {
      if (entry.web !== PLATFORM_FILES.get(entry.path) || entry.source !== undefined) throw new Error(`Invalid platform publication entry: ${entry.path}`);
      continue;
    }
    const prefix = routes.find(route => entry.path.startsWith(route));
    const source = entry.source;
    const approval = approved.get(source?.path);
    if (!prefix || !approval || entry.path !== `${prefix}${source.path}` || entry.web !== true
      || source.sha256 !== approval.sha256 || source.kind !== approval.kind) {
      throw new Error(`Unapproved publication source mapping: ${entry.path}`);
    }
    validateSourceAsset(source);
    if (source.kind !== 'teaching-page' && entry.sha256 !== approval.sha256) throw new Error(`Approved source hash changed: ${entry.path}`);
    if (manifest.courses.some(course => course.entry === entry.path) && source.kind !== 'teaching-page') {
      throw new Error(`Invalid course entry classification: ${entry.path}`);
    }
  }
  for (const filename of PLATFORM_FILES.keys()) if (!files.has(filename)) throw new Error(`Required platform publication entry missing: ${filename}`);
}

function within(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`));
}

export async function safeRoot(root) {
  const absolute = path.resolve(root);
  let component = path.parse(absolute).root;
  for (const part of absolute.slice(component.length).split(path.sep).filter(Boolean)) {
    component = path.join(component, part);
    const info = await lstat(component);
    if (info.isSymbolicLink() || !info.isDirectory()) throw new Error(`Linked or non-directory ancestor: ${component}`);
  }
  return realpath(absolute);
}

export async function safeFile(root, relative) {
  safeRelative(relative);
  const resolvedRoot = await safeRoot(root);
  let target = resolvedRoot;
  const parts = relative.split('/');
  for (const [index, part] of parts.entries()) {
    target = path.join(target, part);
    const info = await lstat(target);
    if (info.isSymbolicLink() || (index < parts.length - 1 ? !info.isDirectory() : !info.isFile())) {
      throw new Error(`Linked or non-regular package component: ${relative}`);
    }
    if (!within(resolvedRoot, await realpath(target))) throw new Error(`Path escaped its root: ${relative}`);
  }
  return target;
}

export async function emptyDirectory(root, relative) {
  safeRelative(relative);
  const resolvedRoot = await safeRoot(root);
  let target = resolvedRoot;
  for (const part of relative.split('/')) {
    target = path.join(target, part);
    try { await mkdir(target); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
    const info = await lstat(target);
    if (info.isSymbolicLink() || !info.isDirectory() || !within(resolvedRoot, await realpath(target))) {
      throw new Error(`Unsafe output directory: ${target}`);
    }
  }
  if ((await readdir(target)).length) throw new Error('Output directory must be empty; existing files are not removed.');
  return target;
}

export async function writePublicFile(root, relative, bytes) {
  safeRelative(relative);
  const resolvedRoot = await safeRoot(root);
  let parent = resolvedRoot;
  for (const part of relative.split('/').slice(0, -1)) {
    parent = path.join(parent, part);
    try { await mkdir(parent); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
    const info = await lstat(parent);
    if (info.isSymbolicLink() || !info.isDirectory() || !within(resolvedRoot, await realpath(parent))) {
      throw new Error(`Unsafe output parent: ${relative}`);
    }
  }
  await writeFile(path.join(parent, path.basename(relative)), bytes, { flag: 'wx' });
}

function decodeAttribute(value) {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function attributes(text) {
  const found = new Map();
  for (const match of text.matchAll(/([^\s\/"'=<>`]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    const name = match[1].toLowerCase();
    if (found.has(name)) throw new Error(`Duplicate HTML attribute: ${name}`);
    found.set(name, match[2] ?? match[3] ?? match[4] ?? '');
  }
  return found;
}

function checkReference(files, origin, reference, anchorCheck) {
  const decoded = decodeAttribute(reference);
  if (/^[a-z][a-z0-9+.-]*:/i.test(decoded) || decoded.startsWith('/') || decoded.includes('\\')) {
    throw new Error(`Non-local resource in ${origin}: ${reference}`);
  }
  const [resource, fragment] = decoded.split('#');
  const clean = decodeURIComponent(resource.split('?')[0]);
  if (clean.startsWith('/') || clean.includes('\\') || /^[a-z][a-z0-9+.-]*:/i.test(clean)) throw new Error(`Non-local encoded resource in ${origin}: ${reference}`);
  const target = clean ? path.posix.normalize(path.posix.join(path.posix.dirname(origin), clean)) : origin;
  if (target === '..' || target.startsWith('../') || !files.has(target)) throw new Error(`Missing or escaping resource in ${origin}: ${reference}`);
  if (anchorCheck && fragment && target.endsWith('.html')) {
    const identifier = decodeURIComponent(fragment);
    const ids = new Set([...files.get(target).toString('utf8').matchAll(/<[a-z][\w:-]*\b((?:"[^"]*"|'[^']*'|[^'">])*)>/gi)].map(match => attributes(match[1]).get('id')));
    if (!ids.has(identifier)) throw new Error(`Missing anchor in ${origin}: ${reference}`);
  }
  return target;
}

function executableTokens(source, target) {
  const tokens = [];
  let index = 0;
  const uncertain = () => { throw new Error(`Unsupported executable UI syntax: ${target}`); };
  function quoted(quote) {
    index++;
    while (index < source.length) {
      const character = source[index++];
      if (character === quote) return;
      if (character === '\\') {
        if (source[index] === '\r' && source[index + 1] === '\n') index++;
        index++;
      } else if (/[\r\n\u2028\u2029]/.test(character)) uncertain();
    }
    uncertain();
  }
  function template() {
    index++;
    tokens.push(null);
    while (index < source.length) {
      const character = source[index++];
      if (character === '`') { tokens.push(null); return; }
      if (character === '\\') index++;
      else if (character === '$' && source[index] === '{') {
        index++;
        tokens.push('{');
        code(true);
      }
    }
    uncertain();
  }
  function code(interpolation = false) {
    let braces = 0;
    let tokenEnd = index;
    while (index < source.length) {
      const rest = source.slice(index);
      const character = source[index];
      if (/\s/.test(character)) { index++; continue; }
      if (index === 0 && rest.startsWith('#!')) {
        while (index < source.length && !/[\r\n\u2028\u2029]/.test(source[index])) index++;
        continue;
      }
      if (rest.startsWith('//')) {
        index += 2;
        while (index < source.length && !/[\r\n\u2028\u2029]/.test(source[index])) index++;
        continue;
      }
      if (rest.startsWith('/*')) {
        const end = source.indexOf('*/', index + 2);
        if (end < 0) uncertain();
        index = end + 2;
        continue;
      }
      if (character === '"' || character === "'") { quoted(character); tokens.push(null); tokenEnd = index; continue; }
      if (character === '`') { template(); tokenEnd = index; continue; }
      const word = rest.match(/^[\p{ID_Start}_$][\p{ID_Continue}$\u200C\u200D]*/u)?.[0];
      if (word) { tokens.push(word); index += word.length; tokenEnd = index; continue; }
      const number = rest.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/)?.[0];
      if (number) { tokens.push(null); index += number.length; tokenEnd = index; continue; }
      if (character === '\\') uncertain();
      if (character === '/') {
        const previous = tokens.at(-1);
        if ([')', '}', '++', '--', '.', '?.'].includes(previous)) uncertain();
        const member = ['.', '?.'].includes(tokens.at(-2));
        if (typeof previous === 'string' && /^[\p{ID_Start}_$]/u.test(previous)
          && ((/^(?:return|throw|case|delete|void|typeof|yield|await|in|of|instanceof|new|extends|default|else|do|break|continue|debugger)$/.test(previous) && !member)
            || /[\r\n\u2028\u2029]/.test(source.slice(tokenEnd, index)))) uncertain();
        const startsRegex = tokens.length === 0 || (typeof previous === 'string'
          && /^(?:[([{=,:;!?&|+*\/%~<>-]|=>|&&|\|\||\?\?|\*\*|\.\.\.)$/.test(previous));
        if (startsRegex) {
          index++;
          let inClass = false;
          let closed = false;
          while (index < source.length) {
            const next = source[index++];
            if (/[\r\n\u2028\u2029]/.test(next)) uncertain();
            if (next === '\\') index++;
            else if (next === '[') {
              if (inClass) uncertain();
              inClass = true;
            }
            else if (next === ']') inClass = false;
            else if (next === '/' && !inClass) { closed = true; break; }
          }
          if (!closed) uncertain();
          while (/[a-z]/i.test(source[index] ?? '') && index < source.length) index++;
          tokens.push(null);
          tokenEnd = index;
          continue;
        }
      }
      const operator = rest.match(/^(?:\.\.\.|\?\.|=>|\+\+|--|&&|\|\||\?\?|\*\*)/)?.[0] ?? character;
      tokens.push(operator);
      index += operator.length;
      tokenEnd = index;
      if (operator === '{') braces++;
      if (operator === '}') {
        if (interpolation && braces === 0) return;
        braces--;
      }
    }
    if (interpolation) uncertain();
  }
  code();
  return tokens;
}

function validateExecutable(source, target) {
  const tokens = executableTokens(source, target);
  const dependency = () => { throw new Error(`Network or module dependency in executable UI: ${target}`); };
  for (const [index, token] of tokens.entries()) {
    const next = tokens[index + 1];
    if (['fetch', 'XMLHttpRequest', 'WebSocket'].includes(token) && (next === '(' || next === '?.')) dependency();
    const member = ['.', '?.'].includes(tokens[index - 1]) || next === ':';
    if (member) continue;
    if (token === 'import' && !(next === '.' && tokens[index + 2] === 'meta')) dependency();
    if (token === 'export') {
      if (next === '*') dependency();
      if (next === '{') {
        const end = tokens.indexOf('}', index + 2);
        if (end < 0 || tokens[end + 1] === 'from') dependency();
      } else if (!['default', 'const', 'let', 'var', 'function', 'class', 'async'].includes(next)) dependency();
    }
  }
}

export function validateLinks(files) {
  for (const [name, bytes] of files) {
    const text = bytes.toString('utf8');
    if (name.endsWith('.html')) {
      for (const match of text.matchAll(/<([a-z][\w:-]*)\b((?:"[^"]*"|'[^']*'|[^'">])*)>/gi)) {
        const tag = match[1].toLowerCase();
        const fields = attributes(match[2]);
        if (tag === 'base') throw new Error(`Unsupported base element in ${name}`);
        if (tag === 'style' || fields.has('style')) throw new Error(`Unsupported inline style in ${name}`);
        if ([...fields.keys()].some(field => /^on[a-z]+$/.test(field))) throw new Error(`Inline event handler in ${name}`);
        for (const property of ['href', 'src']) if (fields.has(property)) checkReference(files, name, fields.get(property), true);
        if (fields.has('srcset')) for (const candidate of fields.get('srcset').split(',')) checkReference(files, name, candidate.trim().split(/\s+/)[0], false);
        if (tag === 'script' && fields.has('src')) {
          const target = checkReference(files, name, fields.get('src'), false);
          const script = files.get(target)?.toString('utf8') ?? '';
          validateExecutable(script, target);
        }
      }
      for (const match of text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)) if (match[1].trim()) throw new Error(`Inline script in ${name}`);
    }
    if (name.endsWith('.css')) {
      for (const match of text.matchAll(/url\(\s*["']?([^\s)"']+)["']?\s*\)|@import\s+["']([^"']+)["']/gi)) {
        checkReference(files, name, match[1] ?? match[2], false);
      }
    }
  }
}

async function enumerate(root, prefix = '') {
  const found = [];
  for (const item of await readdir(path.join(root, prefix), { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${item.name}` : item.name;
    const info = await lstat(path.join(root, relative));
    if (info.isSymbolicLink()) throw new Error(`Linked package entry: ${relative}`);
    if (!info.isDirectory() && !info.isFile()) throw new Error(`Non-regular package entry: ${relative}`);
    if (!prefix && item.name === '.git') continue;
    if (info.isDirectory()) found.push(...await enumerate(root, relative));
    else if (info.isFile()) found.push(relative);
  }
  return found.sort();
}

export function releaseIdentity(sourceCommit, entries) {
  return digest(JSON.stringify({ sourceCommit, files: entries }));
}

export function retainPublishedEditions(manifest, requiredEditions) {
  if (!Array.isArray(requiredEditions) || requiredEditions.some(value => typeof value !== 'string' || !/^[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+$/.test(value))) throw new Error('Trusted prior edition list is invalid.');
  const current = new Set(manifest.courses.map(course => `${course.competitionId}/${course.courseId}/${course.editionId}`));
  for (const edition of requiredEditions) if (!current.has(edition)) throw new Error(`Published edition was removed: ${edition}`);
}

function validateManifestCourses(courses) {
  if (!Array.isArray(courses) || !courses.length) throw new Error('Invalid release course list.');
  const routes = new Set();
  for (const course of courses) {
    if (!course || typeof course !== 'object' || Array.isArray(course)) throw new Error('Invalid release course.');
    for (const key of ['competitionId', 'courseId', 'editionId']) {
      if (typeof course[key] !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(course[key]) || course[key].length > 70) {
        throw new Error(`Invalid lowercase course identifier: ${key}`);
      }
    }
    const route = `courses/${course.competitionId}/${course.courseId}/${course.editionId}/`;
    if (routes.has(route)) throw new Error('Duplicate competition/course/edition route.');
    routes.add(route);
    safeRelative(course.entry);
    if (!course.entry.endsWith('.html') || !course.entry.startsWith(route)) throw new Error(`Invalid course HTML entry namespace: ${course.entry}`);
  }
}

export async function verifyRelease(root, { expectedManifestSha256, requireRelease = false, requiredEditions } = {}) {
  const resolvedRoot = await safeRoot(root);
  const manifestBytes = await readFile(await safeFile(resolvedRoot, 'release.json'));
  if (requireRelease && !/^[a-f0-9]{64}$/.test(expectedManifestSha256 ?? '')) throw new Error('Deployment requires a trusted manifest SHA-256 from outside the package.');
  if (expectedManifestSha256 !== undefined && digest(manifestBytes) !== expectedManifestSha256) throw new Error('Reviewed manifest SHA-256 mismatch.');
  const manifest = JSON.parse(manifestBytes);
  if (manifest.schemaVersion !== 1 || manifest.kind !== 'teaching-preview'
    || !/^(?:[a-f0-9]{40}|local-preview)$/.test(manifest.sourceCommit)
    || !Array.isArray(manifest.files) || !manifest.files.length || !Array.isArray(manifest.courses)) {
    throw new Error('Invalid release manifest.');
  }
  if (requireRelease && manifest.sourceCommit === 'local-preview') throw new Error('Local preview cannot be deployed.');
  validateManifestCourses(manifest.courses);
  const files = new Map();
  for (const entry of manifest.files) {
    publicPath(entry.path);
    if (entry.path === 'release.json' || files.has(entry.path) || !/^[a-f0-9]{64}$/.test(entry.sha256)
      || !Number.isSafeInteger(entry.bytes) || entry.bytes < 0 || typeof entry.web !== 'boolean') throw new Error('Invalid or duplicate release entry.');
    const bytes = await readFile(await safeFile(resolvedRoot, entry.path));
    if (bytes.length !== entry.bytes || digest(bytes) !== entry.sha256) throw new Error(`Release hash mismatch: ${entry.path}`);
    files.set(entry.path, bytes);
  }
  const expected = [...files.keys(), 'release.json'].sort();
  if (JSON.stringify(await enumerate(resolvedRoot)) !== JSON.stringify(expected)) throw new Error('Actual package file set differs from the reviewed manifest.');
  if (manifest.releaseId !== releaseIdentity(manifest.sourceCommit, manifest.files)) throw new Error('Release identity mismatch.');
  const web = new Map(manifest.files.filter(entry => entry.web).map(entry => [entry.path, files.get(entry.path)]));
  if (!web.has('index.html') || !web.has('catalog.json') || !web.has('.nojekyll')) throw new Error('Required web entry missing.');
  for (const course of manifest.courses) {
    if (!web.has(course.entry)) throw new Error(`Course entry is missing from verified web files: ${course.entry}`);
  }
  validatePublicationMapping(manifest, files);
  validateLinks(new Map([...web, ['release.json', manifestBytes]]));
  if (requireRelease) retainPublishedEditions(manifest, requiredEditions);
  return { manifest, files, web, manifestBytes, manifestSha256: digest(manifestBytes) };
}

export async function exportWeb(root, output, options = {}) {
  const verified = await verifyRelease(root, options);
  const target = await emptyDirectory(root, output);
  for (const [name, bytes] of verified.web) await writePublicFile(target, name, bytes);
  await writePublicFile(target, 'release.json', verified.manifestBytes);
  return verified;
}

async function main() {
  const options = process.argv.slice(2);
  const output = options.find(value => value.startsWith('--out='))?.slice(6);
  const expectedManifestSha256 = options.find(value => value.startsWith('--expect='))?.slice(9);
  const requireRelease = options.includes('--release');
  const editionOption = options.find(value => value.startsWith('--prior-editions='))?.slice(17);
  const requiredEditions = editionOption === undefined ? undefined : JSON.parse(editionOption);
  if (options.some(value => value !== '--release' && !value.startsWith('--out=') && !value.startsWith('--expect=') && !value.startsWith('--prior-editions='))
    || new Set(options.map(value => value.split('=')[0])).size !== options.length) throw new Error('Usage: node verify-release.mjs [--release --expect=reviewed-sha256 --prior-editions=trusted-json-list] [--out=_site]');
  const root = path.dirname(fileURLToPath(import.meta.url));
  const settings = { expectedManifestSha256, requireRelease, requiredEditions };
  const verified = output ? await exportWeb(root, output, settings) : await verifyRelease(root, settings);
  console.log(`Verified ${verified.files.size} files; release=${verified.manifest.releaseId}; manifest=${verified.manifestSha256}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
