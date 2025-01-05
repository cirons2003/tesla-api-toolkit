import PublicKey from '../PublicKey';
import {
    expectedPublicUncompressedHexClient,
    expectedPublicUncompressedHexVehicle,
    testPemPrivateKeyVehicle,
    testPemPublicKeyClient,
    testPemPublicKeyVehicle,
} from './testValues';

describe('PublicKey', () => {
    it('Should properly construct from PEM', () => {
        const publicKeyClient = PublicKey.fromPem(testPemPublicKeyClient);
        expect(publicKeyClient.toHex()).toBe(
            expectedPublicUncompressedHexClient,
        );

        const publicKeyVehicle = PublicKey.fromPem(testPemPublicKeyVehicle);
        expect(publicKeyVehicle.toHex()).toBe(
            expectedPublicUncompressedHexVehicle,
        );
    });

    it('Should properly construct from uncompressed hexString', () => {
        const publicKeyClient = PublicKey.fromUncompressedHexString(
            expectedPublicUncompressedHexClient,
        );
        expect(publicKeyClient.toPem()).toBe(testPemPublicKeyClient);

        const publicKeyVehicle = PublicKey.fromUncompressedHexString(
            expectedPublicUncompressedHexVehicle,
        );
        expect(publicKeyVehicle.toPem()).toBe(testPemPublicKeyVehicle);
    });

    it('Should throw an error when constructed from invalid PEM', () => {
        const invalidPems = [
            'uaijhgb',
            `-----BEGIN PRIVATE KEY-----
            INVALID
            -----END PRIVATE KEY-----
            `,
            testPemPrivateKeyVehicle,
        ];

        invalidPems.map((invalidPem) => {
            expect(() => PublicKey.fromPem(invalidPem)).toThrow();
        });
    });
});
