const PrivateKey =
    require('./src/token-manager/HTTPClient/vehicle/objects/PrivateKey').default;
const PublicKey =
    require('./src/token-manager/HTTPClient/vehicle/objects/PublicKey').default;

const clientPrivateKey = new PrivateKey(`-----BEGIN EC PRIVATE KEY-----
MHcCAQEEICU4zcKal8GcHpmmN9bPT4yXDBGLVu3h5jI+bRYsSzDboAoGCCqGSM49
AwEHoUQDQgAEsra8aMLaBmXOZWgVWUmWxiOU7di+qQX+eBp1T+aoRacUMwkC8iXp
Jp1GbgWzSZgf2p2FzCPG+0RKpztikQXcbg==
-----END EC PRIVATE KEY-----`);

const clientPublicKey = PublicKey.fromPem(`-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEsra8aMLaBmXOZWgVWUmWxiOU7di+
qQX+eBp1T+aoRacUMwkC8iXpJp1GbgWzSZgf2p2FzCPG+0RKpztikQXcbg==
-----END PUBLIC KEY-----`);

jest.mock('./src/token-manager/HTTPClient/vehicle/keys.ts', () => ({
    clientPrivateKey,
    clientPublicKey,
}));
