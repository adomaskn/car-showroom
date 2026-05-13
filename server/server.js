import http from 'node:http';
import crypto from 'node:crypto';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'models.json');
const uploadDir = path.join(projectRoot, 'public', 'models', 'uploads');
const distDir = path.join(projectRoot, 'dist');

const appBasePath = '/car-showroom';
const maxUploadBytes = 40 * 1024 * 1024;
const port = Number(process.env.PORT || 8787);
const devMode = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';

const mimeByExtension = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.glb', 'model/gltf-binary'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp']
]);

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function normalizePathInside(baseDir, requestPath) {
  const decodedPath = decodeURIComponent(requestPath).replace(/\\/g, '/');
  const relativePath = decodedPath.replace(/^\/+/, '');
  const candidate = path.resolve(baseDir, relativePath);
  const relation = path.relative(baseDir, candidate);
  if (relation.startsWith('..') || path.isAbsolute(relation)) {
    return null;
  }
  return candidate;
}

function deriveModelName(fileName, proposedName) {
  const fallbackName = path.parse(fileName).name.replace(/[-_]+/g, ' ').trim() || 'Uploaded Model';
  const selectedName = (proposedName || fallbackName).trim().replace(/\s+/g, ' ');
  return selectedName.slice(0, 80);
}

function toFileSlug(fileName) {
  const rawBase = path.parse(fileName).name.toLowerCase();
  const sanitized = rawBase.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return sanitized || 'model';
}

function isValidGlbBuffer(buffer) {
  if (!buffer || buffer.length < 12) {
    return false;
  }
  return buffer.readUInt32LE(0) === 0x46546c67;
}

async function ensureStorage() {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(uploadDir, { recursive: true });

  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, JSON.stringify({ uploads: [] }, null, 2));
  }
}

async function readDatabase() {
  await ensureStorage();
  const raw = await fs.readFile(dataFile, 'utf8');

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.uploads)) {
      return { uploads: [] };
    }
    return parsed;
  } catch {
    return { uploads: [] };
  }
}

async function writeDatabase(database) {
  await ensureStorage();
  const payload = JSON.stringify(database, null, 2);
  await fs.writeFile(dataFile, payload);
}

function readJsonBody(req, byteLimit) {
  return new Promise((resolve, reject) => {
    let done = false;
    let size = 0;
    const chunks = [];

    req.on('data', (chunk) => {
      if (done) return;
      size += chunk.length;
      if (size > byteLimit) {
        done = true;
        reject(createHttpError(413, 'Upload payload is too large.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (done) return;
      done = true;

      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        const parsed = raw ? JSON.parse(raw) : {};
        resolve(parsed);
      } catch {
        reject(createHttpError(400, 'Invalid JSON body.'));
      }
    });

    req.on('error', (error) => {
      if (done) return;
      done = true;
      reject(error);
    });
  });
}

function sendNotFound(res) {
  sendJson(res, 404, { error: 'Not found.' });
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function extractModelIdFromPath(pathname) {
  const match = pathname.match(/^\/api\/models\/([^/]+)$/);
  if (!match) {
    return null;
  }

  return decodeURIComponent(match[1]);
}

function toUploadFilePath(modelPath) {
  if (typeof modelPath !== 'string' || !modelPath.startsWith('/uploads/')) {
    return null;
  }

  const uploadSubpath = modelPath.slice('/uploads/'.length);
  return normalizePathInside(uploadDir, uploadSubpath);
}

async function pathIsFile(candidatePath) {
  if (!candidatePath) {
    return false;
  }

  try {
    const stats = await fs.stat(candidatePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

async function pruneBrokenUploadRecords(database) {
  let changed = false;
  const nextUploads = [];

  for (const record of database.uploads) {
    if (!record || typeof record.id !== 'string' || typeof record.path !== 'string') {
      changed = true;
      continue;
    }

    if (record.path.startsWith('/uploads/')) {
      const filePath = toUploadFilePath(record.path);
      const exists = await pathIsFile(filePath);
      if (!exists) {
        changed = true;
        continue;
      }
    }

    nextUploads.push(record);
  }

  if (changed) {
    database.uploads = nextUploads;
    await writeDatabase(database);
  }

  return database.uploads;
}

async function removeUploadFileWithRetry(filePath) {
  if (!filePath) {
    return { removed: false, skipped: true };
  }

  const retryableErrors = new Set(['EBUSY', 'EPERM', 'EACCES']);
  const maxAttempts = 4;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await fs.unlink(filePath);
      return { removed: true };
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { removed: false, missing: true };
      }

      if (retryableErrors.has(error.code) && attempt < maxAttempts) {
        await sleep(120 * attempt);
        continue;
      }

      return { removed: false, error };
    }
  }

  return { removed: false, error: new Error('Unknown cleanup failure.') };
}

async function sendStaticFile(res, absolutePath) {
  let stats;
  try {
    stats = await fs.stat(absolutePath);
  } catch {
    return false;
  }

  if (!stats.isFile()) {
    return false;
  }

  const extension = path.extname(absolutePath).toLowerCase();
  const contentType = mimeByExtension.get(extension) || 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': stats.size,
    'Cache-Control': extension === '.glb' ? 'public, max-age=600' : 'public, max-age=60'
  });

  await new Promise((resolve, reject) => {
    const stream = createReadStream(absolutePath);
    stream.on('error', reject);
    stream.on('end', resolve);
    stream.pipe(res);
  });

  return true;
}

async function handleGetModels(res) {
  const database = await readDatabase();
  const models = await pruneBrokenUploadRecords(database);
  sendJson(res, 200, { models });
}

async function handleUploadModel(req, res) {
  const contentType = (req.headers['content-type'] || '').toLowerCase();
  if (!contentType.includes('application/json')) {
    throw createHttpError(415, 'Use application/json for uploads.');
  }

  const payload = await readJsonBody(req, maxUploadBytes * 1.4);
  const originalFileName = typeof payload.fileName === 'string' ? payload.fileName.trim() : '';
  const dataBase64 = typeof payload.dataBase64 === 'string' ? payload.dataBase64.trim() : '';
  const uploadedBy = typeof payload.uploadedBy === 'string' ? payload.uploadedBy.trim().toLowerCase() : '';

  if (!originalFileName || !dataBase64) {
    throw createHttpError(400, 'fileName and dataBase64 are required.');
  }

  if (!originalFileName.toLowerCase().endsWith('.glb')) {
    throw createHttpError(400, 'Only .glb uploads are supported.');
  }

  const binary = Buffer.from(dataBase64, 'base64');
  if (!binary.length) {
    throw createHttpError(400, 'Uploaded file is empty.');
  }

  if (binary.length > maxUploadBytes) {
    throw createHttpError(413, 'Model exceeds the 40MB limit.');
  }

  if (!isValidGlbBuffer(binary)) {
    throw createHttpError(400, 'Uploaded file is not a valid GLB binary.');
  }

  const fileSlug = toFileSlug(originalFileName);
  const uniqueFileName = `${Date.now()}-${fileSlug}-${crypto.randomBytes(4).toString('hex')}.glb`;
  const destination = path.join(uploadDir, uniqueFileName);
  await fs.writeFile(destination, binary);

  const modelRecord = {
    id: crypto.randomUUID(),
    name: deriveModelName(originalFileName, payload.name),
    path: `/uploads/${uniqueFileName}`,
    source: 'upload',
    uploadedBy,
    originalFileName,
    createdAt: new Date().toISOString()
  };

  const database = await readDatabase();
  database.uploads.push(modelRecord);
  await writeDatabase(database);

  sendJson(res, 201, { model: modelRecord });
}

async function handleRenameModel(req, res, modelId) {
  const contentType = (req.headers['content-type'] || '').toLowerCase();
  if (!contentType.includes('application/json')) {
    throw createHttpError(415, 'Use application/json for rename.');
  }

  const payload = await readJsonBody(req, 16 * 1024);
  const nextNameRaw = typeof payload.name === 'string' ? payload.name.trim() : '';
  const nextName = nextNameRaw.replace(/\s+/g, ' ').slice(0, 80);

  if (!nextName) {
    throw createHttpError(400, 'Model name is required.');
  }

  const database = await readDatabase();
  const modelIndex = database.uploads.findIndex((model) => model.id === modelId);

  if (modelIndex < 0) {
    throw createHttpError(404, 'Model not found.');
  }

  const updatedModel = {
    ...database.uploads[modelIndex],
    name: nextName,
    updatedAt: new Date().toISOString()
  };

  database.uploads[modelIndex] = updatedModel;
  await writeDatabase(database);

  sendJson(res, 200, { model: updatedModel });
}

async function handleDeleteModel(res, modelId) {
  const database = await readDatabase();
  const modelIndex = database.uploads.findIndex((model) => model.id === modelId);

  if (modelIndex < 0) {
    throw createHttpError(404, 'Model not found.');
  }

  const [removedModel] = database.uploads.splice(modelIndex, 1);
  await writeDatabase(database);

  const filePath = toUploadFilePath(removedModel.path);
  const cleanup = await removeUploadFileWithRetry(filePath);

  if (cleanup.error) {
    console.warn(`[model-server] File cleanup warning for model ${modelId}:`, cleanup.error.message);
  }

  sendJson(res, 200, {
    deleted: true,
    model: removedModel,
    cleanup: {
      removedFile: cleanup.removed === true,
      warning: cleanup.error ? cleanup.error.message : null
    }
  });
}

async function handleUploads(res, pathname) {
  const uploadSubpath = pathname.slice('/uploads/'.length);
  const candidate = normalizePathInside(uploadDir, uploadSubpath);
  if (!candidate) {
    sendNotFound(res);
    return;
  }

  const served = await sendStaticFile(res, candidate);
  if (!served) {
    sendNotFound(res);
  }
}

async function handleBuiltApp(res, pathname) {
  if (pathname === '/') {
    res.writeHead(302, { Location: `${appBasePath}/` });
    res.end();
    return;
  }

  const baseWithSlash = `${appBasePath}/`;
  if (pathname === appBasePath) {
    res.writeHead(302, { Location: baseWithSlash });
    res.end();
    return;
  }

  if (!pathname.startsWith(baseWithSlash)) {
    sendNotFound(res);
    return;
  }

  const appRelativePath = pathname.slice(baseWithSlash.length) || 'index.html';
  const targetAsset = normalizePathInside(distDir, appRelativePath);

  if (targetAsset) {
    const served = await sendStaticFile(res, targetAsset);
    if (served) {
      return;
    }
  }

  const indexFile = path.join(distDir, 'index.html');
  const servedIndex = await sendStaticFile(res, indexFile);
  if (!servedIndex) {
    sendJson(res, 500, {
      error: 'Production build not found. Run "npm run build" before starting the server.'
    });
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;
    const modelId = extractModelIdFromPath(pathname);

    if (req.method === 'GET' && pathname === '/api/models') {
      await handleGetModels(res);
      return;
    }

    if (req.method === 'POST' && pathname === '/api/models') {
      await handleUploadModel(req, res);
      return;
    }

    if (req.method === 'PATCH' && modelId) {
      await handleRenameModel(req, res, modelId);
      return;
    }

    if (req.method === 'DELETE' && modelId) {
      await handleDeleteModel(res, modelId);
      return;
    }

    if (req.method === 'GET' && pathname.startsWith('/uploads/')) {
      await handleUploads(res, pathname);
      return;
    }

    if (!devMode && req.method === 'GET') {
      await handleBuiltApp(res, pathname);
      return;
    }

    sendNotFound(res);
  } catch (error) {
    const status = error.status || 500;
    const message = status >= 500 ? 'Internal server error.' : error.message;

    if (status >= 500) {
      console.error(error);
    }

    sendJson(res, status, { error: message });
  }
});

await ensureStorage();

server.listen(port, () => {
  const mode = devMode ? 'development API mode' : 'production web mode';
  console.log(`[model-server] Running in ${mode} at http://localhost:${port}`);
});
