import test from 'node:test'; import assert from 'node:assert/strict'; import request from 'supertest'; import app from '../src/app.js';
test('health declares clinical boundary',async()=>{const r=await request(app).get('/api/health');assert.equal(r.status,200);assert.match(r.body.clinicalBoundary,/Decision support/)});
