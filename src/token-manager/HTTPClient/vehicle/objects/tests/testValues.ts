import SessionInfo from '../SessionInfo';
import Vehicle from '../Vehicle';

export const testPemPrivateKeyClient = `-----BEGIN EC PRIVATE KEY-----
MHcCAQEEICU4zcKal8GcHpmmN9bPT4yXDBGLVu3h5jI+bRYsSzDboAoGCCqGSM49
AwEHoUQDQgAEsra8aMLaBmXOZWgVWUmWxiOU7di+qQX+eBp1T+aoRacUMwkC8iXp
Jp1GbgWzSZgf2p2FzCPG+0RKpztikQXcbg==
-----END EC PRIVATE KEY-----`;

export const testPemPublicKeyClient = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEsra8aMLaBmXOZWgVWUmWxiOU7di+
qQX+eBp1T+aoRacUMwkC8iXpJp1GbgWzSZgf2p2FzCPG+0RKpztikQXcbg==
-----END PUBLIC KEY-----`;

export const expectedPublicUncompressedHexClient =
    '04b2b6bc68c2da0665ce656815594996c62394edd8bea905fe781a754fe6a845a714330902f225e9269d466e05b349981fda9d85cc23c6fb444aa73b629105dc6e';

export const testPemPrivateKeyVehicle = `-----BEGIN EC PRIVATE KEY-----
MHcCAQEEIDRO5bRmp88e6xK29QMx2y5exYNO9fS+/P2MvlXCUo1woAoGCCqGSM49
AwEHoUQDQgAEx6H0cThIaqRymXFJSHjTOxok45Vx90im4WxZVbPYd9OmqqDpVRZk
dK9dMsQQ9DmiI0E3rRuwhf1OiBPJWPEdlw==
-----END EC PRIVATE KEY-----`;

export const testPemPublicKeyVehicle = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEx6H0cThIaqRymXFJSHjTOxok45Vx
90im4WxZVbPYd9OmqqDpVRZkdK9dMsQQ9DmiI0E3rRuwhf1OiBPJWPEdlw==
-----END PUBLIC KEY-----`;

export const expectedPublicUncompressedHexVehicle =
    '04c7a1f47138486aa4729971494878d33b1a24e39571f748a6e16c5955b3d877d3a6aaa0e955166474af5d32c410f439a2234137ad1bb085fd4e8813c958f11d97';

export const expectedSharedHex = '1b2fce19967b79db696f909cff89ea9a';

export const testSessionInfo = new SessionInfo(
    Buffer.from(
        '0806124104c7a1f47138486aa4729971494878d33b1a24e39571f748a6e16c5955b3d877d3a6aaa0e955166474af5d32c410f439a2234137ad1bb085fd4e8813c958f11d971a104c463f9cc0d3d26906e982ed224adde6255a0a0000',
        'hex',
    ),
);

export const mockedVehicle = {
    connected: true,
    startSession: async () => {},
    isConnected: () => true,
    getSessionInfo: () => testSessionInfo,
    getVIN: () => '5YJ30123456789ABC',
} as unknown as Vehicle;
