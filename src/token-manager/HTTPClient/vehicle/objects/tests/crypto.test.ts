import { SignatureType, Tag } from '../../protobuf/outputs/signatures';
import Crypto from '../Crypto';
import Metadata from '../Metadata';
import PrivateKey from '../PrivateKey';
import PublicKey from '../PublicKey';
import SessionInfo from '../SessionInfo';
import {
    expectedSharedHex,
    testPemPrivateKeyClient,
    testPemPrivateKeyVehicle,
    testPemPublicKeyClient,
    testPemPublicKeyVehicle,
} from './testValues';

describe('Cryto', () => {
    it('Should Properly compute shared secret with peer public key', () => {
        const vehiclePublicKey = PublicKey.fromPem(testPemPublicKeyVehicle);
        const clientPublicKey = PublicKey.fromPem(testPemPublicKeyClient);

        const vehiclePrivateKey = new PrivateKey(testPemPrivateKeyVehicle);
        const clientPrivateKey = new PrivateKey(testPemPrivateKeyClient);

        expect(
            Crypto.getSharedSecret(vehiclePrivateKey, clientPublicKey).toString(
                'hex',
            ),
        ).toBe(expectedSharedHex);

        expect(
            Crypto.getSharedSecret(clientPrivateKey, vehiclePublicKey).toString(
                'hex',
            ),
        ).toBe(expectedSharedHex);
    });

    it('Should properly compute session info key', () => {
        const sharedKey = Buffer.from(
            '1b2fce19967b79db696f909cff89ea9a',
            'hex',
        );

        const sessionInfoKey = Crypto.deriveHMACKey(sharedKey, 'session info');
        expect(sessionInfoKey.toString('hex')).toBe(
            'fceb679ee7bca756fcd441bf238bf2f338629b41d9eb9c67be1b32c9672ce300',
        );
    });

    it('Should properly compute an hmac tag', () => {
        const sessionInfoHex =
            '0806124104c7a1f47138486aa4729971494878d33b1a24e39571f748a6e16c5955b3d877d3a6aaa0e955166474af5d32c410f439a2234137ad1bb085fd4e8813c958f11d971a104c463f9cc0d3d26906e982ed224adde6255a0a0000';
        const sessionInfo = new SessionInfo(Buffer.from(sessionInfoHex, 'hex'));

        const metadata = new Metadata();
        metadata.addUInt8(
            Tag.TAG_SIGNATURE_TYPE,
            SignatureType.SIGNATURE_TYPE_HMAC,
        );
        metadata.addString(Tag.TAG_PERSONALIZATION, '5YJ30123456789ABC');
        metadata.addHexString(
            Tag.TAG_CHALLENGE,
            '1588d5a30eabc6f8fc9a951b11f6fd11',
        );

        const sessionInfoKey = Buffer.from(
            'fceb679ee7bca756fcd441bf238bf2f338629b41d9eb9c67be1b32c9672ce300',
            'hex',
        );

        expect(
            Crypto.getHMACTag(
                metadata.toBytes(),
                sessionInfo.getSessionInfoBytes(),
                sessionInfoKey,
            ).toString('hex'),
        ).toBe(
            '996c1fe38331be138f8039c194b14db2198846ed7d8251e6749284d7b32ea002',
        );
    });

    it('Should properly encrypt a vehicle command', () => {
        const commandBytes = Buffer.from('120452020801', 'hex');
        const metadata = Buffer.from(
            '000105010103021135594a333031323334353637383941424303104c463f9cc0d3d26906e982ed224adde6040400000a5f050400000007ff',
            'hex',
        );
        const sharedKey = Buffer.from(
            '1b2fce19967b79db696f909cff89ea9a',
            'hex',
        );
        const nonce = Buffer.from('dbf79447fa156674dae1caed', 'hex');

        const encryptionData = Crypto.encryptAESGCM(
            commandBytes,
            metadata,
            sharedKey,
            nonce,
        );

        expect(encryptionData.cipherText.toString('hex')).toBe('38038e8c0f2e');
        expect(encryptionData.authTag.toString('hex')).toBe(
            '8e128da165f162f4d7d2c8da866cf82a',
        );
    });
});
