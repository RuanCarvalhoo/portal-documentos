import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lastForwardedIp } from './forwarded-for.ts';

test('takes the address the closest proxy appended, not one the client may have sent', () => {
  assert.equal(lastForwardedIp('6.6.6.6, 203.0.113.7'), '203.0.113.7');
  assert.equal(lastForwardedIp('203.0.113.7'), '203.0.113.7');
});

test('accepts IPv6, including the IPv4-mapped form Node reports for sockets', () => {
  assert.equal(lastForwardedIp('::ffff:172.18.0.1'), '::ffff:172.18.0.1');
  assert.equal(lastForwardedIp('2001:db8::1'), '2001:db8::1');
});

test('returns null for a missing header or anything that is not an IP address', () => {
  for (const header of [null, '', ' , ', 'localhost', '203.0.113.7, <script>']) {
    assert.equal(lastForwardedIp(header), null, `lastForwardedIp(${JSON.stringify(header)})`);
  }
});
