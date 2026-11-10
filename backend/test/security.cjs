const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
process.env.JWT_SECRET = randomBytes(48).toString('base64url');
process.env.JWT_ISSUER = 'security-test';
process.env.JWT_AUDIENCE = 'security-test-client';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const express = require('express');
const { pool } = require('../dist/db/pool');
const { signToken, verifyToken, generateTempPassword } = require('../dist/security');
const { authenticateJWT, requirePasswordChanged, requireRole } = require('../dist/middlewares/auth');
const authRouter = require('../dist/routes/auth').default;
const usersRouter = require('../dist/routes/users').default;
const { asyncRoute, apiErrorHandler } = require('../dist/middlewares/errors');
const { streamUploadProgress } = require('../dist/routes/uploadProgress');
const { FileUploadRepository } = require('../dist/repositories/fileUploadRepository');
let upload;
FileUploadRepository.findById = async () => upload;
let user, unavailable = false, failPasswordLookup = false;
// Isolated in-memory DB adapter: no real connection, migration or seed runs.
pool.query = async (sql, params) => {
  if (unavailable || (failPasswordLookup && sql.startsWith('SELECT password_hash'))) throw new Error('simulated database failure');
  if (sql.startsWith('SELECT password_hash')) return { rows: user ? [{ password_hash: user.password_hash }] : [] };
  if (sql.trimStart().startsWith('SELECT') && sql.includes('FROM admin_users WHERE')) return { rows: user ? [{ ...user }] : [] };
  if (sql.includes('SET password_hash')) {
    if (!user || user.token_version !== params[2] || !user.is_active) return { rows: [] };
    user = { ...user, password_hash: params[0], must_change_password: false, token_version: user.token_version + 1 };
    return { rows: [{ ...user }] };
  }
  if (sql.includes('SET is_active')) {
    user.is_active = params[0]; user.token_version++;
    return { rows: [{ ...user }] };
  }
  if (sql.includes('SET full_name')) {
    if (params[2] !== null && params[2] !== user.role_code) user.token_version++;
    user.role_code = params[2] ?? user.role_code;
    return { rows: [{ ...user }] };
  }
  if (sql.startsWith('DELETE')) { user = null; return { rowCount: 1 }; }
  throw new Error('Unexpected test query');
};
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api', authenticateJWT, requirePasswordChanged);
app.use('/api/users', usersRouter);
app.get('/api/data', (_req, res) => res.json({ ok: true }));
app.get('/api/admin', requireRole('system_admin'), (_req, res) => res.json({ ok: true }));
app.get('/api/progress/:uploadId', asyncRoute(streamUploadProgress));
app.use(apiErrorHandler);
const server = app.listen(0, '127.0.0.1');
after(() => new Promise(resolve => server.close(resolve)));
function payload(version = 0) {
  return { userId: 1, username: 'test', roleCode: 'system_admin', uploadQuotaGb: 1, mustChangePassword: false, tokenVersion: version };
}
async function request(path, token, body, method = 'GET') {
  if (!server.listening) await new Promise(resolve => server.once('listening', resolve));
  return fetch(`http://127.0.0.1:${server.address().port}${path}`, {
    method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}
function reset() {
  unavailable = false;
  failPasswordLookup = false;
  user = { user_id: 1, username: 'test', role_code: 'system_admin', upload_quota_gb: 1,
    must_change_password: false, is_active: true, token_version: 0 };
  upload = { uploadId: 1, userId: 1, uploadStatus: 'uploading' };
}
test('rejects legacy, expired, wrong issuer/audience/algorithm and malformed claims', () => {
  const options = { issuer: process.env.JWT_ISSUER, audience: process.env.JWT_AUDIENCE, expiresIn: '1h' };
  const invalid = [
    jwt.sign({ userId: 1 }, process.env.JWT_SECRET, options),
    jwt.sign(payload(), process.env.JWT_SECRET, { ...options, issuer: 'wrong' }),
    jwt.sign(payload(), process.env.JWT_SECRET, { ...options, audience: 'wrong' }),
    jwt.sign(payload(), process.env.JWT_SECRET, { ...options, algorithm: 'HS384' }),
    jwt.sign(payload(), process.env.JWT_SECRET, { ...options, expiresIn: -1 }),
    jwt.sign({ ...payload(), tokenVersion: '0' }, process.env.JWT_SECRET, options),
    'demo-token',
  ];
  for (const token of invalid) assert.throws(() => verifyToken(token));
  assert.equal(verifyToken(signToken(payload())).tokenVersion, 0);
});
test('revocation, current role, forced password change and database failure', async () => {
  reset(); const token = signToken(payload());
  assert.equal((await request('/api/data', token)).status, 200);
  user.role_code = 'readonly';
  assert.equal((await request('/api/admin', token)).status, 403);
  user.must_change_password = true;
  assert.equal((await request('/api/data', token)).status, 403);
  user.must_change_password = false; user.token_version++;
  assert.equal((await request('/api/data', token)).status, 401);
  user.token_version = 0; user.is_active = false;
  assert.equal((await request('/api/data', token)).status, 401);
  user = null;
  assert.equal((await request('/api/data', token)).status, 401);
  unavailable = true;
  assert.equal((await request('/api/data', token)).status, 503);
});
test('password change revokes old token and returns a usable new token', async () => {
  reset(); const password = randomBytes(24).toString('hex');
  user.password_hash = await bcrypt.hash(password, 4);
  user.must_change_password = true;
  const token = signToken(payload());
  const response = await request('/api/auth/change-password', token,
    { currentPassword: password, newPassword: generateTempPassword() }, 'POST');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const result = await response.json();
  assert.equal((await request('/api/data', token)).status, 401);
  assert.equal((await request('/api/data', result.token)).status, 200);
});
test('disable/reactivate, role edit and deletion revoke existing tokens', async () => {
  reset(); const token = signToken(payload());
  assert.equal((await request('/api/users/1/active', token, { isActive: false }, 'PATCH')).status, 200);
  user.is_active = true;
  assert.equal((await request('/api/data', token)).status, 401);
  reset();
  assert.equal((await request('/api/users/1', token, { roleCode: 'readonly' }, 'PATCH')).status, 200);
  assert.equal((await request('/api/data', token)).status, 401);
  reset();
  assert.equal((await request('/api/users/1', token, { fullName: 'Renamed' }, 'PATCH')).status, 200);
  assert.equal((await request('/api/data', token)).status, 200);
  assert.equal((await request('/api/users/abc', token, { fullName: 'x' }, 'PATCH')).status, 400);
  assert.equal((await request('/api/users/1/active', token, {}, 'PATCH')).status, 400);
  reset();
  assert.equal((await request('/api/users/1', token, undefined, 'DELETE')).status, 200);
  assert.equal((await request('/api/data', token)).status, 401);
});
test('temporary passwords meet policy and contain no duplicates in sample', () => {
  const values = new Set(Array.from({ length: 1000 }, generateTempPassword));
  assert.equal(values.size, 1000);
  for (const value of values) assert.match(value, /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9_-]{32}$/);
});

test('database failures in login and password changes return a safe response', async () => {
  reset(); unavailable = true;
  const response = await request('/api/auth/login', '', { username: 'test', password: generateTempPassword() }, 'POST');
  assert.equal(response.status, 500);
  assert.equal((await response.json()).error, 'INTERNAL_ERROR');
  assert.equal((await request('/api/auth/change-password', signToken(payload()), {}, 'POST')).status, 503);
  unavailable = false; failPasswordLookup = true;
  assert.equal((await request('/api/auth/change-password', signToken(payload()),
    { currentPassword: generateTempPassword(), newPassword: generateTempPassword() }, 'POST')).status, 500);
});

test('simultaneous password changes cannot both reuse the old session version', async () => {
  reset(); const password = generateTempPassword();
  user.password_hash = await bcrypt.hash(password, 4);
  const token = signToken(payload());
  const responses = await Promise.all([1, 2].map(() => request('/api/auth/change-password', token,
    { currentPassword: password, newPassword: generateTempPassword() }, 'POST')));
  assert.deepEqual(responses.map(response => response.status).sort(), [200, 401]);
  assert.equal(user.token_version, 1);
});

test('progress rejects invalid IDs and another user upload before opening a stream', async () => {
  reset(); user.role_code = 'readonly'; const token = signToken(payload());
  for (const id of ['0', '1abc', '-1']) assert.equal((await request('/api/progress/' + id, token)).status, 400);
  upload.userId = 2;
  assert.equal((await request('/api/progress/1', token)).status, 403);
  upload = null;
  assert.equal((await request('/api/progress/1', token)).status, 404);
});

test('an already open progress stream stops after token revocation', async () => {
  reset(); const response = await request('/api/progress/1', signToken(payload()));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const reader = response.body.getReader();
  const first = await reader.read();
  assert.match(new TextDecoder().decode(first.value), /"status":"uploading"/);
  user.token_version++;
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Revoked stream stayed open')), 4000); });
  try { assert.equal((await Promise.race([reader.read(), timeout])).done, true); }
  finally { clearTimeout(timer); await reader.cancel(); }
});

test('progress recovers terminal status when the in-memory cache was cleared', async () => {
  reset(); upload.uploadStatus = 'completed';
  const response = await request('/api/progress/1', signToken(payload()));
  assert.match(await response.text(), /"progress":100,"status":"completed"/);
});
