import PrivateKey from '../PrivateKey';
import PublicKey from '../PublicKey';
import {
    expectedSharedHex,
    testPemPrivateKeyClient,
    testPemPrivateKeyVehicle,
    testPemPublicKeyClient,
    testPemPublicKeyVehicle,
} from './testValues';

describe('PrivateKey', () => {
    it('Should correctly decode PEM', () => {
        expect(() => new PrivateKey(testPemPrivateKeyClient)).not.toThrow();

        expect(() => new PrivateKey(testPemPrivateKeyVehicle)).not.toThrow();
    });

    it('should throw an error for invalid PEM input', () => {
        const invalidPem = `
        -----BEGIN PRIVATE KEY-----
        INVALID
        -----END PRIVATE KEY-----
        `;
        expect(() => new PrivateKey(invalidPem)).toThrow();
    });
});
