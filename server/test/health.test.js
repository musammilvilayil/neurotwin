import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

test('health declares clinical boundary', async () => {
  const r = await request(app).get('/api/health');
  assert.equal(r.status, 200);
  assert.match(r.body.clinicalBoundary, /Decision support/);
});

test('model state stays untrained/demo when weights are absent', async () => {
  const r = await request(app).get('/api/model/state');
  assert.equal(r.status, 200);
  assert.equal(r.body.modelState, 'untrained/demo');
  assert.match(r.body.notice, /untrained|not diagnostic/i);
});
