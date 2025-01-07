import { createPrivateKey, KeyObject } from 'crypto';

class PrivateKey {
    private pem: string;

    constructor(privatePem: string) {
        this.pem = privatePem;

        const key = this.toKeyObject();

        if (key.type != 'private') {
            throw new Error('Non-private key received');
        }

        if (key.asymmetricKeyType != 'ec') {
            throw new Error('Key not from elliptical curve');
        }

        if (key.asymmetricKeyDetails?.namedCurve != 'prime256v1') {
            throw new Error('Key must be generated from NIST-P256');
        }
    }

    toKeyObject(): KeyObject {
        return createPrivateKey(this.pem);
    }
}

export default PrivateKey;
