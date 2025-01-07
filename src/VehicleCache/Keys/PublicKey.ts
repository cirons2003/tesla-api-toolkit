import { createPublicKey, KeyObject } from 'crypto';

class PublicKey {
    private uncompressedBytes: Buffer;
    private pem: string;

    constructor(uncompressedBytes: Buffer, pem: string) {
        this.pem = pem;
        this.uncompressedBytes = uncompressedBytes;
    }

    static fromUncompressedHexString(hexString: string) {
        if (!hexString.startsWith('04')) {
            throw new Error(
                'Invalid uncompressed public key format. Must start with 0x04.',
            );
        }

        if (hexString.length != 130) {
            throw new Error(
                'Invalid uncompressed public key format. Must be 65 bytes',
            );
        }

        const derBuffer = Buffer.concat([
            Buffer.from('3059', 'hex'), // SEQUENCE header
            Buffer.from('3013', 'hex'), // SEQUENCE header for algorithm identifier
            Buffer.from('0607', 'hex'), // OBJECT IDENTIFIER header
            Buffer.from('2a8648ce3d0201', 'hex'), // OID for ecPublicKey
            Buffer.from('0608', 'hex'), // OBJECT IDENTIFIER header
            Buffer.from('2a8648ce3d030107', 'hex'), // OID for prime256v1 (NIST P-256)
            Buffer.from('0342', 'hex'), // BIT STRING header
            Buffer.from([0x00]), // BIT STRING padding
            Buffer.from(hexString, 'hex'), // The actual uncompressed key
        ]);

        // Wrap in PEM format
        const keyString = derBuffer.toString('base64');

        // Newline after every 64 chars
        let formattedKeyString = '';
        for (let i = 0; i < keyString.length; i += 64) {
            if (i != 0) {
                formattedKeyString += '\n';
            }
            formattedKeyString += keyString.slice(
                i,
                Math.min(i + 64, keyString.length),
            );
        }

        const pem = `-----BEGIN PUBLIC KEY-----\n${formattedKeyString}\n-----END PUBLIC KEY-----`;
        const uncompressedBytes = Buffer.from(hexString, 'hex');

        return new PublicKey(uncompressedBytes, pem);
    }

    static fromPem(publicPem: string) {
        const key = createPublicKey(publicPem);

        if (!publicPem.includes('-----BEGIN PUBLIC KEY-----')) {
            throw new Error('Non-private key received');
        }

        if (key.asymmetricKeyType != 'ec') {
            throw new Error('Key not from elliptical curve');
        }

        if (key.asymmetricKeyDetails?.namedCurve != 'prime256v1') {
            throw new Error('Key must be generated from NIST-P256');
        }

        // Export the key as a DER buffer
        const derBuffer = key.export({
            format: 'der',
            type: 'spki',
        });

        // Parse the DER buffer to extract the public key point (end of buffer)
        const publicKeyPointOffset = derBuffer.length - 65; // 65 bytes for 0x04 || x || y
        const uncompressedBytes = derBuffer.subarray(publicKeyPointOffset);

        if (uncompressedBytes[0] !== 0x04) {
            throw new Error('Public key is not in uncompressed format');
        }

        return new PublicKey(uncompressedBytes, publicPem);
    }

    toBuffer(): Buffer {
        return this.uncompressedBytes;
    }

    toHex(): string {
        return this.uncompressedBytes.toString('hex');
    }

    toKeyObject(): KeyObject {
        return createPublicKey(this.pem);
    }

    toPem(): string {
        return this.pem;
    }
}

export default PublicKey;
