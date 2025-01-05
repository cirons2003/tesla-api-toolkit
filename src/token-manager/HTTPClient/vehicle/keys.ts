import PrivateKey from './objects/PrivateKey';
import PublicKey from './objects/PublicKey';

if (!process.env.PUBLIC_KEY_PEM) {
    throw new Error('PUBLIC_KEY_PEM is not set in environment variables');
}

if (!process.env.PRIVATE_KEY_PEM) {
    throw new Error('PRIVATE_KEY_PEM is not set in environment variables');
}

export const clientPrivateKey = new PrivateKey(process.env.PRIVATE_KEY_PEM);

export const clientPublicKey = PublicKey.fromPem(process.env.PUBLIC_KEY_PEM);
