import test from 'node:test';
import assert from 'node:assert/strict';
import { isPublicIp } from '../lib/net/ip.js';

test('publika adresser släpps igenom', () => {
  for (const ip of ['93.184.215.14', '8.8.8.8', '1.1.1.1', '2606:4700:4700::1111', '2a00:1450:4010:c05::64']) {
    assert.equal(isPublicIp(ip), true, ip);
  }
});

test('interna, reserverade och inbäddade adresser blockeras', () => {
  const blocked = [
    '127.0.0.1', '127.1.2.3', '10.0.0.1', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254',
    '100.64.0.1', '0.0.0.0', '224.0.0.1', '255.255.255.255', '198.18.0.1', '192.0.2.1',
    '::', '::1', 'fc00::1', 'fd12:3456::1', 'fe80::1', 'ff02::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1',
    '::ffff:7f00:1', '64:ff9b::a9fe:a9fe', '2002:7f00:0001::', '2001:db8::1', '2001:0:4136:e378::1', 'fec0::1', '[::1]',
  ];
  for (const ip of blocked) assert.equal(isPublicIp(ip), false, ip);
});

test('ogiltiga strängar räknas inte som publika', () => {
  for (const s of ['', 'localhost', '1.2.3', '256.1.1.1', 'abc::xyz', '01.2.3.4x']) assert.equal(isPublicIp(s), false, s);
});
