import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUrl, assertResolvesPublic } from '../lib/net/url-guard.js';

const code = (fn) => { try { fn(); return 'ok'; } catch (e) { return e.code; } };

test('normaliserar vanliga inmatningar', () => {
  assert.equal(normalizeUrl('Wimco.se').toString(), 'https://wimco.se/');
  assert.equal(normalizeUrl('  http://exempel.se/sida#del  ').toString(), 'http://exempel.se/sida');
  assert.equal(normalizeUrl('https://www.exempel.se:443/').toString(), 'https://www.exempel.se/');
  assert.equal(normalizeUrl('exempel.se:80/a').toString(), 'https://exempel.se:80/a');
  assert.equal(normalizeUrl('xn--mlarbyggare-x8a.se').hostname, 'xn--mlarbyggare-x8a.se');
  assert.equal(normalizeUrl('målarbyggare.se').hostname, 'xn--mlarbyggare-x8a.se');
});

test('felaktiga adresser ger invalid_url', () => {
  for (const u of ['', '   ', 'hej', 'http://', 'https://exa mple.se', 'xn--felaktig-puny.se', 'x'.repeat(3000) + '.se', 'http://-foo-.se']) {
    assert.equal(code(() => normalizeUrl(u)), 'invalid_url', JSON.stringify(u).slice(0, 40));
  }
});

test('andra protokoll än http/https nekas', () => {
  for (const u of ['file:///etc/passwd', 'ftp://exempel.se', 'javascript:alert(1)', 'data:text/html,hej', 'gopher://exempel.se', 'ws://exempel.se']) {
    assert.equal(code(() => normalizeUrl(u)), 'invalid_url', u);
  }
});

test('interna mål blockeras redan vid validering', () => {
  const blocked = [
    'http://localhost', 'http://localhost.', 'http://foo.localhost', 'http://127.0.0.1', 'http://2130706433', 'http://0x7f.0.0.1',
    'http://017700000001', 'http://127.1', 'http://[::1]/', 'http://[::ffff:127.0.0.1]/', 'http://169.254.169.254/latest/meta-data/',
    'http://metadata.google.internal/', 'http://10.1.2.3', 'http://192.168.0.1', 'http://intranet.corp', 'http://server.local',
    'http://router.home.arpa', 'https://exempel.se:8080', 'https://exempel.se:22',
  ];
  for (const u of blocked) assert.equal(code(() => normalizeUrl(u)), 'blocked_target', u);
});

test('inloggningsuppgifter i URL nekas', () => {
  assert.equal(code(() => normalizeUrl('https://user:pass@exempel.se')), 'invalid_url');
});

test('DNS som pekar internt blockeras', async () => {
  await assert.rejects(assertResolvesPublic('evil.example.com', async () => ['93.184.215.14', '10.0.0.5']), { code: 'blocked_target' });
  await assert.rejects(assertResolvesPublic('evil.example.com', async () => ['::ffff:169.254.169.254']), { code: 'blocked_target' });
  await assert.rejects(assertResolvesPublic('nx.example.com', async () => { throw new Error('ENOTFOUND'); }), { code: 'unreachable' });
  assert.deepEqual(await assertResolvesPublic('ok.example.com', async () => ['93.184.215.14']), ['93.184.215.14']);
});
