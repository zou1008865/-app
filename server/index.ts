import express from 'express';
import initSqlJs, { type Database, type SqlValue } from 'sql.js';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = 5174;
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDirectory = path.join(projectRoot, 'data');
const databasePath = path.join(dataDirectory, 'finance.db');
const presetCategories = {
  expense: ['餐饮', '交通', '学习', '购物', '娱乐', '生活', '其他'],
  income: ['生活费', '兼职', '奖学金', '红包', '退款', '其他收入'],
} as const;
type TransactionType = keyof typeof presetCategories;
type Transaction = { id: string; type: TransactionType; category: string; amountInCents: number; note: string; date: string; createdAt: string };
type CustomCategories = Record<TransactionType, string[]>;

let database: Database;
let writeQueue = Promise.resolve();

function normalizeName(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}
function isType(value: unknown): value is TransactionType { return value === 'expense' || value === 'income'; }
function isTransaction(value: unknown): value is Transaction {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string' && item.id.length > 0 && isType(item.type) && normalizeName(item.category).length > 0 && Number.isInteger(item.amountInCents) && Number(item.amountInCents) > 0 && typeof item.note === 'string' && typeof item.date === 'string' && typeof item.createdAt === 'string';
}
function rows<T>(sql: string, params: SqlValue[] = []) {
  const statement = database.prepare(sql, params);
  const result: T[] = [];
  while (statement.step()) result.push(statement.getAsObject() as T);
  statement.free();
  return result;
}
function metadata(key: string) { return rows<{ value: string }>('SELECT value FROM app_metadata WHERE key = ?', [key])[0]?.value; }
function customCategories(): CustomCategories {
  const result: CustomCategories = { expense: [], income: [] };
  rows<{ type: TransactionType; name: string }>('SELECT type, name FROM custom_categories ORDER BY name').forEach((item) => result[item.type].push(item.name));
  return result;
}
function getTransactions() {
  return rows<Transaction>('SELECT id, type, category, amountInCents, note, date, createdAt FROM transactions ORDER BY date DESC, createdAt DESC');
}
function isPreset(type: TransactionType, name: string) { return presetCategories[type].includes(name as never); }
function canUseCategory(type: TransactionType, name: string) { return isPreset(type, name) || customCategories()[type].includes(name); }
async function persist() {
  await mkdir(dataDirectory, { recursive: true });
  const temporaryPath = `${databasePath}.tmp`;
  await writeFile(temporaryPath, database.export());
  await rename(temporaryPath, databasePath);
}
function enqueueWrite(action: () => void) {
  const next = writeQueue.then(async () => { action(); await persist(); });
  writeQueue = next.catch(() => undefined);
  return next;
}
async function initializeDatabase() {
  const SQL = await initSqlJs({ locateFile: (file) => path.join(projectRoot, 'node_modules', 'sql.js', 'dist', file) });
  try { database = new SQL.Database(await readFile(databasePath)); } catch { database = new SQL.Database(); }
  database.run(`CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, type TEXT NOT NULL CHECK(type IN ('expense','income')), category TEXT NOT NULL, amountInCents INTEGER NOT NULL, note TEXT NOT NULL, date TEXT NOT NULL, createdAt TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS custom_categories (type TEXT NOT NULL CHECK(type IN ('expense','income')), name TEXT NOT NULL, PRIMARY KEY(type, name));
    CREATE TABLE IF NOT EXISTS app_metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
  await persist();
}
function insertTransaction(transaction: Transaction) {
  database.run('INSERT INTO transactions (id, type, category, amountInCents, note, date, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)', [transaction.id, transaction.type, normalizeName(transaction.category), transaction.amountInCents, transaction.note, transaction.date, transaction.createdAt]);
}

app.use(express.json({ limit: '1mb' }));
app.get('/api/state', (_request, response) => response.json({ transactions: getTransactions(), customCategories: customCategories(), migrated: Boolean(metadata('local_storage_migrated')) }));

app.post('/api/migrate/local-storage', async (request, response) => {
  if (request.get('origin') && request.get('origin') !== 'http://127.0.0.1:5173') return response.json({ status: 'waiting-for-5173' });
  if (metadata('local_storage_migrated')) return response.json({ status: 'already-migrated' });
  const payload = request.body as { transactions?: unknown; customCategories?: unknown };
  const transactions = Array.isArray(payload.transactions) ? payload.transactions.filter(isTransaction) : [];
  const categoryInput = payload.customCategories && typeof payload.customCategories === 'object' ? payload.customCategories as Record<string, unknown> : {};
  const categories: CustomCategories = { expense: [], income: [] };
  (['expense', 'income'] as const).forEach((type) => {
    if (Array.isArray(categoryInput[type])) categories[type] = [...new Set(categoryInput[type].map(normalizeName).filter((name) => name && !isPreset(type, name)))];
    transactions.filter((item) => item.type === type).forEach((item) => { if (!isPreset(type, normalizeName(item.category))) categories[type].push(normalizeName(item.category)); });
    categories[type] = [...new Set(categories[type])];
  });
  try {
    await enqueueWrite(() => {
      database.run('BEGIN');
      try {
        transactions.forEach((transaction) => { if (!rows<{ id: string }>('SELECT id FROM transactions WHERE id = ?', [transaction.id]).length) insertTransaction(transaction); });
        (['expense', 'income'] as const).forEach((type) => categories[type].forEach((name) => database.run('INSERT OR IGNORE INTO custom_categories (type, name) VALUES (?, ?)', [type, name])));
        database.run("INSERT OR REPLACE INTO app_metadata (key, value) VALUES ('local_storage_migrated', ?)", [JSON.stringify({ at: new Date().toISOString(), transactions: transactions.length, categories: categories.expense.length + categories.income.length })]);
        database.run('COMMIT');
      } catch (error) { database.run('ROLLBACK'); throw error; }
    });
    response.json({ status: 'migrated', transactions: transactions.length, categories: categories.expense.length + categories.income.length });
  } catch { response.status(500).json({ message: '迁移失败，原浏览器数据未被修改。' }); }
});

app.post('/api/transactions', async (request, response) => {
  const transaction = request.body;
  if (!isTransaction(transaction) || !canUseCategory(transaction.type, normalizeName(transaction.category))) return response.status(400).json({ message: '账目或分类无效。' });
  try { await enqueueWrite(() => insertTransaction(transaction)); response.status(201).json(transaction); } catch { response.status(500).json({ message: '账目保存失败。' }); }
});
app.delete('/api/transactions/:id', async (request, response) => {
  try { await enqueueWrite(() => database.run('DELETE FROM transactions WHERE id = ?', [request.params.id])); response.status(204).end(); } catch { response.status(500).json({ message: '账目删除失败。' }); }
});

app.post('/api/categories', async (request, response) => {
  const { type, name } = request.body as Record<string, unknown>; const normalized = normalizeName(name);
  if (!isType(type) || !normalized || canUseCategory(type, normalized)) return response.status(400).json({ message: '分类名称无效或已经存在。' });
  try { await enqueueWrite(() => database.run('INSERT INTO custom_categories (type, name) VALUES (?, ?)', [type, normalized])); response.status(201).json({ type, name: normalized }); } catch { response.status(500).json({ message: '分类保存失败。' }); }
});
app.patch('/api/categories/:type/:name', async (request, response) => {
  const type = request.params.type; const name = decodeURIComponent(request.params.name); const nextName = normalizeName(request.body?.name);
  if (!isType(type) || isPreset(type, name) || !nextName || canUseCategory(type, nextName)) return response.status(400).json({ message: '分类名称无效或不可修改。' });
  try { await enqueueWrite(() => { database.run('BEGIN'); try { database.run('UPDATE transactions SET category = ? WHERE type = ? AND category = ?', [nextName, type, name]); database.run('UPDATE custom_categories SET name = ? WHERE type = ? AND name = ?', [nextName, type, name]); database.run('COMMIT'); } catch (error) { database.run('ROLLBACK'); throw error; } }); response.json({ type, name: nextName }); } catch { response.status(500).json({ message: '分类修改失败。' }); }
});
app.delete('/api/categories/:type/:name', async (request, response) => {
  const type = request.params.type; const name = decodeURIComponent(request.params.name); const replacement = normalizeName(request.body?.replacement);
  if (!isType(type) || isPreset(type, name) || !replacement || replacement === name || !canUseCategory(type, replacement)) return response.status(400).json({ message: '替代分类无效。' });
  try { await enqueueWrite(() => { database.run('BEGIN'); try { database.run('UPDATE transactions SET category = ? WHERE type = ? AND category = ?', [replacement, type, name]); database.run('DELETE FROM custom_categories WHERE type = ? AND name = ?', [type, name]); database.run('COMMIT'); } catch (error) { database.run('ROLLBACK'); throw error; } }); response.status(204).end(); } catch { response.status(500).json({ message: '分类删除失败。' }); }
});

initializeDatabase().then(() => app.listen(port, '127.0.0.1', () => console.log(`Finance API: http://127.0.0.1:${port}`))).catch((error) => { console.error(error); process.exit(1); });
