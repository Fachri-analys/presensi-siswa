#!/usr/bin/env node
/**
 * Load Test Script — Sistem Presensi Siswa
 *
 * Menggunakan native Node.js HTTP untuk load testing tanpa dependency eksternal.
 *
 * Usage:
 *   node backend/scripts/load-test.mjs --users 100 --duration 30
 *   node backend/scripts/load-test.mjs --users 300 --duration 30
 *   node backend/scripts/load-test.mjs --users 800 --duration 30
 *   node backend/scripts/load-test.mjs --host http://localhost:3000 --users 100
 *
 * Pastikan backend sudah berjalan sebelum menjalankan script ini.
 */

import http from 'node:http';
import { URL } from 'node:url';
import { performance } from 'node:perf_hooks';

// ─── Parse CLI args ──────────────────────────────────────────
const args = process.argv.slice(2);
function getArg(name, fallback) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

const HOST = getArg('host', 'http://localhost:3000');
const USERS = parseInt(getArg('users', '100'), 10);
const DURATION_S = parseInt(getArg('duration', '30'), 10);

console.log(`\n🔧 Load Test Configuration`);
console.log(`   Host:     ${HOST}`);
console.log(`   Users:    ${USERS} concurrent`);
console.log(`   Duration: ${DURATION_S}s\n`);

// ─── HTTP Request Helper ─────────────────────────────────────
function makeRequest(path, method = 'GET', body = null, cookie = '') {
  return new Promise((resolve) => {
    const url = new URL(path, HOST);
    const start = performance.now();

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
      },
      timeout: 30000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const latency = performance.now() - start;
        resolve({
          status: res.statusCode,
          latency,
          success: res.statusCode >= 200 && res.statusCode < 400,
          data,
        });
      });
    });

    req.on('error', () => {
      resolve({
        status: 0,
        latency: performance.now() - start,
        success: false,
        data: '',
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        status: 0,
        latency: performance.now() - start,
        success: false,
        data: '',
      });
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// ─── Stat Collector ──────────────────────────────────────────
class StatCollector {
  constructor(name) {
    this.name = name;
    this.latencies = [];
    this.successes = 0;
    this.failures = 0;
  }

  record(result) {
    this.latencies.push(result.latency);
    if (result.success) this.successes++;
    else this.failures++;
  }

  report() {
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const total = sorted.length;
    if (total === 0) {
      return { endpoint: this.name, total: 0, ok: 0, fail: 0, rps: 0, avg: 0, p50: 0, p95: 0, p99: 0, errRate: '0%' };
    }
    const sum = sorted.reduce((a, b) => a + b, 0);
    const p = (pct) => sorted[Math.min(Math.floor(total * pct), total - 1)];
    return {
      endpoint: this.name,
      total,
      ok: this.successes,
      fail: this.failures,
      rps: (total / DURATION_S).toFixed(1),
      avg: (sum / total).toFixed(1),
      p50: p(0.5).toFixed(1),
      p95: p(0.95).toFixed(1),
      p99: p(0.99).toFixed(1),
      errRate: ((this.failures / total) * 100).toFixed(2) + '%',
    };
  }
}

// ─── Test Scenarios ──────────────────────────────────────────
const endpoints = [
  { name: 'GET /health', path: '/health', method: 'GET' },
  { name: 'POST /auth/login', path: '/api/v1/auth/login', method: 'POST', body: { email: 'admin@test.local', password: 'Test1234!' } },
  { name: 'GET /students', path: '/api/v1/students?page=1&limit=20', method: 'GET' },
  { name: 'GET /classes', path: '/api/v1/classes?page=1&limit=20', method: 'GET' },
];

async function runEndpointTest(endpoint, concurrency, durationMs) {
  const stats = new StatCollector(endpoint.name);
  const endTime = performance.now() + durationMs;

  async function worker() {
    while (performance.now() < endTime) {
      const result = await makeRequest(
        endpoint.path,
        endpoint.method,
        endpoint.body || null,
      );
      stats.record(result);
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  return stats.report();
}

// ─── Main ────────────────────────────────────────────────────
async function main() {
  console.log('━'.repeat(80));
  console.log(`🚀 Starting load test with ${USERS} concurrent users, ${DURATION_S}s per endpoint`);
  console.log('━'.repeat(80));

  const results = [];

  for (const endpoint of endpoints) {
    console.log(`\n⏳ Testing: ${endpoint.name} ...`);
    const report = await runEndpointTest(endpoint, USERS, DURATION_S * 1000);
    results.push(report);
    console.log(`   ✅ ${report.total} requests | ${report.rps} req/s | p95=${report.p95}ms | err=${report.errRate}`);
  }

  // Print summary table
  console.log('\n' + '━'.repeat(80));
  console.log('📊 LOAD TEST RESULTS SUMMARY');
  console.log('━'.repeat(80));
  console.log(
    'Endpoint'.padEnd(25) +
    'Total'.padStart(8) +
    'OK'.padStart(8) +
    'Fail'.padStart(8) +
    'RPS'.padStart(8) +
    'Avg(ms)'.padStart(10) +
    'P50(ms)'.padStart(10) +
    'P95(ms)'.padStart(10) +
    'P99(ms)'.padStart(10) +
    'Err%'.padStart(8)
  );
  console.log('─'.repeat(105));

  for (const r of results) {
    console.log(
      r.endpoint.padEnd(25) +
      String(r.total).padStart(8) +
      String(r.ok).padStart(8) +
      String(r.fail).padStart(8) +
      String(r.rps).padStart(8) +
      String(r.avg).padStart(10) +
      String(r.p50).padStart(10) +
      String(r.p95).padStart(10) +
      String(r.p99).padStart(10) +
      String(r.errRate).padStart(8)
    );
  }

  console.log('─'.repeat(105));
  console.log('\n📋 Thresholds:');
  console.log('   ✅ P95 < 500ms for reads (GET)');
  console.log('   ✅ P95 < 1000ms for writes (POST/PUT)');
  console.log('   ✅ Error rate < 1%');
  console.log('   ✅ Throughput > 50 req/s per endpoint\n');
}

main().catch(console.error);
