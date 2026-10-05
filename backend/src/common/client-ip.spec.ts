import { CLIENT_IP_HEADER, clientIpOf, PROXY_SECRET_HEADER } from './client-ip';

const SECRET = 'segredo-compartilhado-com-o-frontend-0123';
const request = (headers: Record<string, string | string[]>) => ({ ip: '172.18.0.4', headers });

describe('clientIpOf', () => {
  it('uses the IP forwarded by the web server when it proves itself with the shared secret', () => {
    expect(
      clientIpOf(request({ [CLIENT_IP_HEADER]: '203.0.113.7', [PROXY_SECRET_HEADER]: SECRET }), SECRET),
    ).toBe('203.0.113.7');
  });

  it('ignores the forwarded IP when the secret is wrong or missing', () => {
    expect(
      clientIpOf(request({ [CLIENT_IP_HEADER]: '203.0.113.7', [PROXY_SECRET_HEADER]: 'chute' }), SECRET),
    ).toBe('172.18.0.4');
    expect(clientIpOf(request({ [CLIENT_IP_HEADER]: '203.0.113.7' }), SECRET)).toBe('172.18.0.4');
  });

  it('treats an empty secret as no secret, so an empty header cannot match it', () => {
    expect(clientIpOf(request({ [CLIENT_IP_HEADER]: '203.0.113.7', [PROXY_SECRET_HEADER]: '' }), '')).toBe(
      '172.18.0.4',
    );
  });

  it('ignores the forwarded IP when the API has no shared secret configured', () => {
    expect(
      clientIpOf(request({ [CLIENT_IP_HEADER]: '203.0.113.7', [PROXY_SECRET_HEADER]: SECRET }), undefined),
    ).toBe('172.18.0.4');
  });

  it('ignores an empty or repeated forwarded header', () => {
    expect(clientIpOf(request({ [CLIENT_IP_HEADER]: '', [PROXY_SECRET_HEADER]: SECRET }), SECRET)).toBe(
      '172.18.0.4',
    );
    expect(
      clientIpOf(
        request({ [CLIENT_IP_HEADER]: ['1.1.1.1', '2.2.2.2'], [PROXY_SECRET_HEADER]: SECRET }),
        SECRET,
      ),
    ).toBe('172.18.0.4');
  });
});
