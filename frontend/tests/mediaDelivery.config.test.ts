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

interface ServiceWorkerRule {
  pattern: string;
  handler: string;
  regex: RegExp;
}

function serviceWorkerRules(vite: string): ServiceWorkerRule[] {
  return [...vite.matchAll(/urlPattern:\s*(\/.*\/[a-z]*),\s*handler:\s*'([^']+)'/g)].map((match) => {
    const literal = match[1];
    const lastSlash = literal.lastIndexOf('/');
    return {
      pattern: literal,
      handler: match[2],
      regex: new RegExp(literal.slice(1, lastSlash), literal.slice(lastSlash + 1)),
    };
  });
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
    const mediaRules = rules.filter((rule) => rule.regex.test('/uploads/postcards/media-private.png'));

    expect(mediaRules.length).toBeGreaterThan(0);
    expect(mediaRules[0].handler).toBe('NetworkOnly');
    expect(mediaRules.some((rule) => rule.handler === 'CacheFirst')).toBe(false);
  });

  it('keeps caching the assets of the application', () => {
    const rules = serviceWorkerRules(readRootFile('vite.config.ts'));
    const assetRules = rules.filter((rule) => rule.regex.test('/assets/logo.png'));

    expect(assetRules.length).toBeGreaterThan(0);
    expect(assetRules[0].handler).toBe('CacheFirst');
  });

  it('lets the browser store the media session cookie on the API calls', async () => {
    const { api } = await import('@/shared/lib/api');

    expect((api as unknown as { client: { defaults: { withCredentials?: boolean } } }).client.defaults.withCredentials).toBe(true);
  });
});
