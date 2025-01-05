import {
    createCipheriv,
    createHash,
    createHmac,
    diffieHellman,
    timingSafeEqual,
} from 'crypto';
import PublicKey from './PublicKey';
import PrivateKey from './PrivateKey';
import Metadata from './Metadata';
import SessionInfo from './SessionInfo';

export class CryptoError extends Error {
    constructor(message: string) {
        super(`Crypto Error: ${message}`);
    }
}

export type EncryptionData = {
    cipherText: Buffer;
    authTag: Buffer;
};

class Crypto {
    // Validated in Unit tests
    static getSharedSecret(
        privateKey: PrivateKey,
        peerPublicKey: PublicKey,
    ): Buffer {
        const sharedSecret = diffieHellman({
            privateKey: privateKey.toKeyObject(),
            publicKey: peerPublicKey.toKeyObject(),
        }); // Sx from ECDH => (Sx, Sy) as Buffer

        const paddedSecret = to32Bytes(sharedSecret);

        const hashedSecret = createHash('sha1').update(paddedSecret).digest();

        return hashedSecret.subarray(0, 16);
    }

    static deriveHMACKey(sharedKey: Buffer, message: string): Buffer {
        return createHmac('SHA256', sharedKey).update(message).digest();
    }

    static getHMACTag(
        metadataBytes: Buffer,
        payloadBytes: Buffer,
        hmacKey: Buffer,
    ): Buffer {
        const concatBuffer = Buffer.concat([metadataBytes, payloadBytes]);

        const hmac = createHmac('SHA256', hmacKey);
        hmac.update(concatBuffer);
        return hmac.digest();
    }

    static hmacTagsEqual(tag1: Buffer, tag2: Buffer): boolean {
        console.log('comparing tags');
        if (tag1.length != tag2.length) return false;
        return timingSafeEqual(tag1, tag2);
    }

    static encryptAESGCM(
        commandBytes: Buffer,
        metadataBytes: Buffer,
        sharedKey: Buffer,
        nonce: Buffer,
    ): EncryptionData {
        const aad = createHash('SHA256').update(metadataBytes).digest();

        const cipher = createCipheriv('aes-128-gcm', sharedKey, nonce);
        cipher.setAAD(aad);

        const encryptedCommandBytes = cipher.update(commandBytes);
        const padding = cipher.final();

        const cipherText = Buffer.concat([encryptedCommandBytes, padding]);

        const authTag = cipher.getAuthTag();

        return { cipherText, authTag };
    }
}

const to32Bytes = (sharedSecretBigEndian: Buffer): Buffer => {
    if (sharedSecretBigEndian.length > 32) {
        throw new CryptoError('Shared secret over 32 bytes');
    }

    const padding = Buffer.alloc(32 - sharedSecretBigEndian.length, 0x00);
    return Buffer.concat([padding, sharedSecretBigEndian]);
};

export default Crypto;
