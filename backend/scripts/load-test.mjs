#!/usr/bin/env node
/** Run only against a local or staging API with test data. */

import { performance } from 'node:perf_hooks';

const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const positiveInt = (name, fallback, max) => {
  const value = Number(getArg(name, fallback));
  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw new Error(`--${name} harus berupa bilangan bulat 1–${max}.`);
  }
  return value;
};

const host = new URL(getArg('host', process.env.LOAD_TEST_HOST ?? 'http://localhost:4000'));
if (!['http:', 'https:'].includes(host.protocol)) throw new Error('--host harus menggunakan HTTP atau HTTPS.');
const users = positiveInt('users', '20', 1000);
const durationSeconds = positiveInt('duration', '10', 600);
const maxReadP95 = positiveInt('max-read-p95-ms', '500', 60000);
const minRps = Number(getArg('min-rps', '50'));
const maxErrorRate = Number(getArg('max-error-rate', '1'));
if (!Number.isFinite(minRps) || minRps < 0 || !Number.isFinite(maxErrorRate) || maxErrorRate < 0 || maxErrorRate > 100) {
  throw new Error('--min-rps atau --max-error-rate tidak valid.');
}

const SAMPLE_LIMIT = 50_000;

async function send(path, { method = 'GET', body, cookie } = {}) {
  const started = performance.now();
  try {
    const response = await fetch(new URL(path, host), {
      method,
      headers: {
        accept: 'application/json',
        ...(body ? { 'content-type': 'application/json' } : {}),
        ...(cookie ? { cookie } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(30_000),
      redirect: 'error',
    });
    return { status: response.status, latency: performance.now() - started, success: response.status >= 200 && response.status < 300 };
  } catch {
    return { status: 0, latency: performance.now() - started, success: false };
  }
}

class Stats {
  total = 0;
  failures = 0;
  sum = 0;
  samples = [];

  record(result) {
    this.total++;
    this.sum += result.latency;
    if (!result.success) this.failures++;
    if (this.samples.length < SAMPLE_LIMIT) this.samples.push(result.latency);
    else {
      const slot = Math.floor(Math.random() * this.total);
      if (slot < SAMPLE_LIMIT) this.samples[slot] = result.latency;
    }
  }

  report(name) {
    const sorted = this.samples.toSorted((a, b) => a - b);
    const percentile = (fraction) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] ?? 0;
    return {
      endpoint: name,
      total: this.total,
      fail: this.failures,
      rps: this.total / durationSeconds,
      avg: this.total ? this.sum / this.total : 0,
      p95: percentile(0.95),
      errorRate: this.total ? (this.failures / this.total) * 100 : 100,
    };
  }
}

async function login() {
  const email = process.env.LOAD_TEST_EMAIL;
  const password = process.env.LOAD_TEST_PASSWORD;
  if (!email || !password) throw new Error('Atur LOAD_TEST_EMAIL dan LOAD_TEST_PASSWORD untuk endpoint yang memerlukan autentikasi.');
  const response = await fetch(new URL('/api/v1/auth/login', host), {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json', origin: host.origin },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(30_000),
    redirect: 'error',
  });
  if (!response.ok) throw new Error(`Login uji gagal dengan HTTP ${response.status}.`);
  const cookie = response.headers.get('set-cookie')?.split(';', 1)[0];
  if (!cookie) throw new Error('Login uji berhasil tetapi cookie sesi tidak ditemukan.');
  return cookie;
}

async function runEndpoint(name, path, cookie) {
  const stats = new Stats();
  const endAt = performance.now() + durationSeconds * 1000;
  async function worker() {
    while (performance.now() < endAt) stats.record(await send(path, { cookie }));
  }
  await Promise.all(Array.from({ length: users }, () => worker()));
  return stats.report(name);
}

async function main() {
  const health = await send('/health');
  if (!health.success) throw new Error(`Health check gagal dengan HTTP ${health.status}.`);
  const cookie = await login();
  const results = [];
  results.push(await runEndpoint('GET /health', '/health'));
  results.push(await runEndpoint('GET /students', '/api/v1/students?page=1&limit=20', cookie));
  results.push(await runEndpoint('GET /classes', '/api/v1/classes', cookie));

  console.log(`Host ${host.origin} | ${users} concurrent users | ${durationSeconds}s per endpoint`);
  console.table(results.map((result) => ({
    endpoint: result.endpoint,
    requests: result.total,
    failures: result.fail,
    'req/s': result.rps.toFixed(1),
    'avg ms': result.avg.toFixed(1),
    'p95 ms': result.p95.toFixed(1),
    'error %': result.errorRate.toFixed(2),
  })));

  const failed = results.filter((result) =>
    result.total === 0 || result.p95 >= maxReadP95 || result.errorRate > maxErrorRate || result.rps < minRps,
  );
  if (failed.length) {
    console.error(`GAGAL: target p95 < ${maxReadP95} ms, error <= ${maxErrorRate}%, req/s >= ${minRps}.`);
    process.exitCode = 1;
  } else {
    console.log('LULUS: seluruh endpoint memenuhi ambang.');
  }
}

main().catch((error) => {
  console.error(`Load test dihentikan: ${error.message}`);
  process.exitCode = 1;
});
