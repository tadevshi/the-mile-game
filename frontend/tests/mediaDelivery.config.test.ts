import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const frontendRoot = path.resolve(import.meta.dirname, '..');

function readRootFile(name: string): string {
  return fs.readFileSync(path.join(frontendRoot, name), 'utf8');
}

function nginxUploadsBlock(nginx: string): string {
  const start = nginx.indexOf('location ^~ /uploads/');
  expect(start).toBeGreaterThan(-1);
  const end = nginx.indexOf('location ', start + 10);
  return nginx.slice(start, end === -1 ? nginx.length : end);
}

function serviceWorkerRules(vite: string): Array<{ pattern: string; handler: string }> {
  return [...vite.matchAll(/urlPattern:\s*([^,]+),\s*handler:\s*'([^']+)'/g)].map((match) => ({
    pattern: match[1],
    handler: match[2],
  }));
}

describe('media delivery configuration', () => {
  it('serves the media through the backend instead of an unauthenticated nginx alias', () => {
    const block = nginxUploadsBlock(readRootFile('nginx.conf'));

    expect(block).not.toMatch(/alias\s/);
    expect(block).toMatch(/proxy_pass\s+http:\/\/backend:8080/);
    expect(block).not.toMatch(/Cache-Control\s+"public"/);
  });

  it('never lets the service worker cache the media', () => {
    const rules = serviceWorkerRules(readRootFile('vite.config.ts'));
    const mediaRules = rules.filter((rule) => rule.pattern.includes('uploads'));

    expect(mediaRules.length).toBeGreaterThan(0);
    for (const rule of mediaRules) {
      expect(rule.handler).toBe('NetworkOnly');
    }
  });

  it('lets the browser store the media session cookie on the API calls', async () => {
    const { api } = await import('@/shared/lib/api');

    expect((api as unknown as { client: { defaults: { withCredentials?: boolean } } }).client.defaults.withCredentials).toBe(true);
  });
});
