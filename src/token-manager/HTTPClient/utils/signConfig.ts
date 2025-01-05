import crypto from 'crypto';
import { RequestConfig } from '../HTTPClient';
import { HttpError, Httpify } from '../../../middleware/errorHandler';

// throws http errors
export const signConfig = (config: RequestConfig) => {
    try {
        const signedConfig = { ...config };
        if (!signedConfig.headers) {
            signedConfig.headers = {};
        }
        const requestData = config.data;
        const timestamp = Date.now().toString();
        const nonce = crypto.randomBytes(16).toString('hex');
        const signature = generateSignature(requestData, timestamp, nonce);
        signedConfig.headers['X-Signature'] = signature;
        signedConfig.headers['X-Timestamp'] = timestamp;
        signedConfig.headers['X-Nonce'] = nonce;
        return signedConfig;
    } catch (err) {
        throw Httpify(err, 'Failed to Sign Request');
    }
};

const generateSignature = (
    requestData: any,
    timestamp: string,
    nonce: string,
) => {
    const dataToSign = `${timestamp}.${nonce}.${JSON.stringify(requestData)}`;
    const sign = crypto.createSign('SHA256');
    sign.update(dataToSign);
    sign.end();
    const pk = process.env.PRIVATE_KEY;
    if (!pk) {
        throw new HttpError(
            undefined,
            "Failed to generate signature: Can't find private key",
            500,
        );
    }
    try {
        const signature = sign.sign(pk, 'base64');
        return signature;
    } catch (err) {
        throw Httpify(err, 'Failed to generate signature');
    }
};
