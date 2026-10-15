import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import * as https from 'node:https';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as tls from 'node:tls';
import { expect } from 'chai';
import got from 'got';
import { applyNovuTlsTrust, isNovuTlsEnabled, loadNovuTlsConfig, toNovuTlsServerOptions } from './novu-tls';

const TLS_VARIABLES = [
  'NOVU_TLS_ENABLED',
  'NOVU_TLS_CERT_BASE64',
  'NOVU_TLS_CERT_FILE',
  'NOVU_TLS_KEY_BASE64',
  'NOVU_TLS_KEY_FILE',
  'NOVU_TLS_KEY_PASSPHRASE',
  'NOVU_TLS_CA_BASE64',
  'NOVU_TLS_CA_FILE',
];

let fixtureDir: string;
let originalEnv: NodeJS.ProcessEnv;

function pem(name: string): string {
  return readFileSync(join(fixtureDir, name), 'utf8');
}

function base64(name: string): string {
  return readFileSync(join(fixtureDir, name)).toString('base64');
}

function openssl(args: string[]): void {
  execFileSync('openssl', args, { cwd: fixtureDir, stdio: 'pipe' });
}

describe('novu-tls', () => {
  /** A private CA plus a leaf for `localhost`, mirroring what an operator supplies. */
  beforeAll(() => {
    fixtureDir = mkdtempSync(join(tmpdir(), 'novu-tls-spec-'));
    openssl([
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-days',
      '1',
      '-keyout',
      'ca-key.pem',
      '-out',
      'ca.pem',
      '-subj',
      '/CN=Novu Test CA',
    ]);
    openssl([
      'req',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-keyout',
      'leaf-key.pem',
      '-out',
      'leaf.csr',
      '-subj',
      '/CN=localhost',
    ]);
    execFileSync(
      'openssl',
      [
        'x509',
        '-req',
        '-in',
        'leaf.csr',
        '-CA',
        'ca.pem',
        '-CAkey',
        'ca-key.pem',
        '-CAcreateserial',
        '-days',
        '1',
        '-out',
        'leaf.pem',
        '-extfile',
        '/dev/stdin',
      ],
      { cwd: fixtureDir, input: 'subjectAltName=DNS:localhost,IP:127.0.0.1', stdio: 'pipe' }
    );
  });

  afterAll(() => {
    rmSync(fixtureDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    originalEnv = { ...process.env };
    for (const variable of TLS_VARIABLES) {
      delete process.env[variable];
    }
    process.env.NOVU_ENTERPRISE = 'true';
    process.env.IS_SELF_HOSTED = 'true';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  function enableWithBase64(): void {
    process.env.NOVU_TLS_ENABLED = 'true';
    process.env.NOVU_TLS_CERT_BASE64 = base64('leaf.pem');
    process.env.NOVU_TLS_KEY_BASE64 = base64('leaf-key.pem');
    process.env.NOVU_TLS_CA_BASE64 = base64('ca.pem');
  }

  describe('loadNovuTlsConfig', () => {
    it('returns undefined when TLS is not enabled, leaving plain HTTP untouched', () => {
      expect(isNovuTlsEnabled()).to.equal(false);
      expect(loadNovuTlsConfig()).to.equal(undefined);
    });

    it('returns undefined when TLS is explicitly disabled even if material is present', () => {
      process.env.NOVU_TLS_ENABLED = 'false';
      process.env.NOVU_TLS_CERT_BASE64 = base64('leaf.pem');

      expect(loadNovuTlsConfig()).to.equal(undefined);
    });

    it('loads material from base64 variables', () => {
      enableWithBase64();

      const config = loadNovuTlsConfig();

      expect(config?.cert).to.equal(pem('leaf.pem'));
      expect(config?.key).to.equal(pem('leaf-key.pem'));
      expect(config?.ca).to.equal(pem('ca.pem'));
      expect(config?.passphrase).to.equal(undefined);
    });

    it('loads material from file variables', () => {
      process.env.NOVU_TLS_ENABLED = 'true';
      process.env.NOVU_TLS_CERT_FILE = join(fixtureDir, 'leaf.pem');
      process.env.NOVU_TLS_KEY_FILE = join(fixtureDir, 'leaf-key.pem');
      process.env.NOVU_TLS_CA_FILE = join(fixtureDir, 'ca.pem');

      const config = loadNovuTlsConfig();

      expect(config?.cert).to.equal(pem('leaf.pem'));
      expect(config?.ca).to.equal(pem('ca.pem'));
    });

    it('rejects a mix of the base64 and file form for the same item', () => {
      enableWithBase64();
      process.env.NOVU_TLS_CERT_FILE = join(fixtureDir, 'leaf.pem');

      expect(() => loadNovuTlsConfig()).to.throw('NOVU_TLS_CERT_BASE64 and NOVU_TLS_CERT_FILE are both set');
    });

    it('rejects a missing certificate', () => {
      process.env.NOVU_TLS_ENABLED = 'true';
      process.env.NOVU_TLS_KEY_BASE64 = base64('leaf-key.pem');
      process.env.NOVU_TLS_CA_BASE64 = base64('ca.pem');

      expect(() => loadNovuTlsConfig()).to.throw('neither NOVU_TLS_CERT_BASE64 nor NOVU_TLS_CERT_FILE is set');
    });

    it('rejects a missing CA', () => {
      process.env.NOVU_TLS_ENABLED = 'true';
      process.env.NOVU_TLS_CERT_BASE64 = base64('leaf.pem');
      process.env.NOVU_TLS_KEY_BASE64 = base64('leaf-key.pem');

      expect(() => loadNovuTlsConfig()).to.throw('neither NOVU_TLS_CA_BASE64 nor NOVU_TLS_CA_FILE is set');
    });

    it('rejects material that is not PEM', () => {
      enableWithBase64();
      process.env.NOVU_TLS_CERT_BASE64 = Buffer.from('definitely not a certificate').toString('base64');

      expect(() => loadNovuTlsConfig()).to.throw('NOVU_TLS_CERT_BASE64 does not contain PEM data');
    });

    it('rejects a file that does not exist', () => {
      process.env.NOVU_TLS_ENABLED = 'true';
      process.env.NOVU_TLS_CERT_FILE = join(fixtureDir, 'missing.pem');
      process.env.NOVU_TLS_KEY_BASE64 = base64('leaf-key.pem');
      process.env.NOVU_TLS_CA_BASE64 = base64('ca.pem');

      expect(() => loadNovuTlsConfig()).to.throw('NOVU_TLS_CERT_FILE could not be read');
    });

    it('rejects a key that does not match the certificate', () => {
      enableWithBase64();
      process.env.NOVU_TLS_KEY_BASE64 = base64('ca-key.pem');

      expect(() => loadNovuTlsConfig()).to.throw('could not be loaded as a TLS key pair');
    });

    it('rejects enabling TLS outside enterprise self-hosted', () => {
      enableWithBase64();
      process.env.NOVU_ENTERPRISE = 'false';

      expect(() => loadNovuTlsConfig()).to.throw('only supported on enterprise self-hosted');

      process.env.NOVU_ENTERPRISE = 'true';
      process.env.IS_SELF_HOSTED = 'false';

      expect(() => loadNovuTlsConfig()).to.throw('only supported on enterprise self-hosted');
    });
  });

  describe('toNovuTlsServerOptions', () => {
    it('passes the key pair through without the CA, so the server does not demand client certificates', () => {
      enableWithBase64();
      process.env.NOVU_TLS_KEY_PASSPHRASE = 'unused-here';

      const options = toNovuTlsServerOptions(loadNovuTlsConfig() as NonNullable<ReturnType<typeof loadNovuTlsConfig>>);

      expect(Object.keys(options).sort()).to.deep.equal(['cert', 'key', 'passphrase']);
      expect(options).to.not.have.property('ca');
      expect(options.passphrase).to.equal('unused-here');
    });
  });

  describe('applyNovuTlsTrust', () => {
    let defaultCertificates: string[];

    beforeEach(() => {
      defaultCertificates = tls.getCACertificates('default');
    });

    afterEach(() => {
      // The trust store is process-global, so it must not leak into other suites.
      tls.setDefaultCACertificates(defaultCertificates);
    });

    it('makes a privately signed certificate verifiable while keeping the public roots', async () => {
      enableWithBase64();
      const config = loadNovuTlsConfig();
      if (!config) {
        throw new Error('expected a TLS config');
      }

      const server = https.createServer(toNovuTlsServerOptions(config), (_req, res) => {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
      });
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
      const { port } = server.address() as { port: number };

      // `got` is what HttpClientService issues its requests through, so this is the
      // same trust path the services use, with verification left on.
      const request = () =>
        got(`https://localhost:${port}/`, {
          responseType: 'json',
          https: { rejectUnauthorized: true },
          retry: 0,
        }).json<{ status: string }>();

      try {
        let rejected = false;
        try {
          await request();
        } catch {
          rejected = true;
        }
        expect(rejected, 'private CA must not be trusted before applyNovuTlsTrust').to.equal(true);

        applyNovuTlsTrust(config);

        const response = await request();
        expect(response.status).to.equal('ok');

        // Public roots are still present, so outbound provider calls keep working.
        expect(tls.getCACertificates('default').length).to.be.at.least(defaultCertificates.length);
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    });
  });
});
