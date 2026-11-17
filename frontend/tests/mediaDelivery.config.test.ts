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

describe('media delivery configuration', () => {
  it('serves the media through the backend instead of an unauthenticated nginx alias', () => {
    const block = nginxUploadsBlock(readRootFile('nginx.conf'));

    expect(block).not.toMatch(/alias\s/);
    expect(block).toMatch(/proxy_pass\s+http:\/\/backend:8080/);
    expect(block).not.toMatch(/Cache-Control\s+"public"/);
  });
});
