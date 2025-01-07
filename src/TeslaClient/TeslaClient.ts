import PrivateKey from './Keys/PrivateKey';
import PublicKey from './Keys/PublicKey';

export type ClientContext = {
    publicKey: PublicKey;
    privateKey: PrivateKey;
    getAccessToken: (id: string, type: 'user' | 'vehicle') => Promise<string>;
    refreshAccessToken: (
        id: string,
        type: 'user' | 'vehicle',
    ) => Promise<string>;
    maxRetries: number;
};

export enum ClientContextErrorCode {
    TOKEN_RETRIEVAL_FAILED = 1,
    TOKEN_REFRESH_FAILED = 2,
}

class TeslaClient {
    private context: ClientContext;

    constructor(context: ClientContext) {
        this.context = context;
    }
}
