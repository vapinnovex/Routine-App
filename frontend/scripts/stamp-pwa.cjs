// Give every exported app shell its own cache without hand-editing release numbers.
const { createHash } = require('node:crypto');
const { readFileSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const dist = resolve(__dirname, '../dist');
const html = readFileSync(resolve(dist, 'index.html'));
const revision = createHash('sha256').update(html).digest('hex').slice(0, 12);
const worker = readFileSync(resolve(__dirname, '../public/service-worker.js'), 'utf8');
writeFileSync(resolve(dist, 'service-worker.js'), worker.replace('routine-web-v5', `routine-web-v5-${revision}`));
console.log(`PWA cache stamped: ${revision}`);
