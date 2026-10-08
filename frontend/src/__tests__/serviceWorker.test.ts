import { readFileSync } from 'fs';
import { resolve } from 'path';
import { runInNewContext } from 'vm';

function worker() {
  const handlers: Record<string, (event: any) => void> = {};
  const cache = { addAll: jest.fn(), match: jest.fn(), put: jest.fn() };
  const caches = { open: jest.fn().mockResolvedValue(cache), keys: jest.fn(), delete: jest.fn() };
  const fetch = jest.fn();
  runInNewContext(readFileSync(resolve(__dirname, '../../public/service-worker.js'), 'utf8'), {
    self: { location: { origin: 'https://routine.test' }, clients: { claim: jest.fn() },
      addEventListener: (name: string, handler: any) => { handlers[name] = handler; } },
    caches, fetch, URL, Response,
  });
  return { handlers, cache, caches, fetch };
}

it('never intercepts APIs, authenticated requests, other origins, or unknown resources', () => {
  const { handlers } = worker();
  for (const [path, auth] of [['/api/v1/users/me', false], ['/assets/private.json', true], ['/users/me', false], ['https://other.test/image.png', false]]) {
    const respondWith = jest.fn();
    handlers.fetch({ request: { url: new URL(path as string, 'https://routine.test').href, method: 'GET', mode: 'cors', headers: new Headers(auth ? { Authorization: 'Bearer test' } : {}) }, respondWith });
    expect(respondWith).not.toHaveBeenCalled();
  }
});

it('caches navigation at its actual URL without replacing the home shell', async () => {
  const { handlers, cache, fetch } = worker();
  fetch.mockResolvedValue(new Response('task page'));
  const request = { url: 'https://routine.test/task/123', method: 'GET', mode: 'navigate', headers: new Headers() };
  let response!: Promise<Response>;
  handlers.fetch({ request, respondWith: (value: Promise<Response>) => { response = value; } });
  await response;
  expect(cache.put.mock.calls[0][0]).toBe(request);
});

it('does not cache private navigation responses', async () => {
  const { handlers, cache, fetch } = worker();
  fetch.mockResolvedValue(new Response('private', { headers: { 'Cache-Control': 'private, no-store' } }));
  let response!: Promise<Response>;
  handlers.fetch({ request: { url: 'https://routine.test/settings', method: 'GET', mode: 'navigate', headers: new Headers() }, respondWith: (value: Promise<Response>) => { response = value; } });
  await response;
  expect(cache.put).not.toHaveBeenCalled();
});

it('only removes caches belonging to Routine', async () => {
  const { handlers, caches } = worker();
  caches.keys.mockResolvedValue(['routine-web-v4', 'routine-web-v5', 'another-app']);
  let done!: Promise<void>;
  handlers.activate({ waitUntil: (value: Promise<void>) => { done = value; } });
  await done;
  expect(caches.delete.mock.calls).toEqual([['routine-web-v4']]);
});
