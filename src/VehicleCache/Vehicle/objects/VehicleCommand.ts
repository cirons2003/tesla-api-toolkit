import { randomBytes } from 'crypto';
import { SignatureType, Tag } from '../protobuf/outputs/signatures';
import Crypto from './Crypto';
import Metadata from './Metadata';
import SessionInfo from './SessionInfo';
import { Domain, RoutableMessage } from '../protobuf/outputs/universal_message';
import PublicKey from '../../Keys/PublicKey';

export class VehicleCommandError extends Error {
    constructor(message: string) {
        super(`Vehicle Command Error: ${message}`);
    }
}

class VehicleCommand {
    private commandBytes: Buffer;
    private sessionInfo: SessionInfo;
    private vin: string;
    private publicKey: PublicKey;
    private domain: Domain;
    private createdAtSeconds: number;
    private expiresAtSeconds: number;
    private routingAddress: Buffer;
    private uuid: Buffer;
    private nonce: Buffer;

    private metadataBytes: Buffer;

    private cachedBytes?: Buffer;

    //for testing
    private cipherText?: Buffer;
    private authTag?: Buffer;

    constructor(
        commandBytes: Buffer,
        vin: string,
        publicKey: PublicKey,
        sessionInfo: SessionInfo,
        domain: Domain,
        secondsToExpiration: number,
    ) {
        this.commandBytes = commandBytes;
        this.sessionInfo = sessionInfo;
        this.vin = vin;
        this.publicKey = publicKey;
        this.domain = domain;
        const vehicleSeconds = this.sessionInfo.getVehicleSeconds();
        this.expiresAtSeconds = vehicleSeconds + secondsToExpiration;

        this.createdAtSeconds = Math.floor(new Date().getTime() / 1000);

        this.metadataBytes = this.#encodeCommandMetadata().toBytes();

        this.uuid = randomBytes(16);
        this.routingAddress = randomBytes(16);
        this.nonce = randomBytes(12);

        this.createdAtSeconds = Math.floor(new Date().getTime() / 1000);
    }

    /* Currently assumes SIGNATURE_TYPE_HMAC_PERSONALIZED */
    toBytes(): Buffer {
        if (true || !this.cachedBytes) {
            this.cachedBytes = this.#getHMACBytes();
        }
        return this.cachedBytes;
    }

    toBase64(): string {
        return this.toBytes().toString('base64');
    }

    /* Currently assumes SIGNATURE_TYPE_HMAC_PERSONALIZED */
    #encodeCommandMetadata(): Metadata {
        const sessionInfo = this.sessionInfo;

        const metadata = new Metadata();
        metadata.addUInt8(
            Tag.TAG_SIGNATURE_TYPE,
            SignatureType.SIGNATURE_TYPE_HMAC_PERSONALIZED,
        );
        metadata.addUInt8(Tag.TAG_DOMAIN, this.domain);
        metadata.addString(Tag.TAG_PERSONALIZATION, this.vin);
        metadata.addHexString(
            Tag.TAG_EPOCH,
            sessionInfo.getEpoch().toString('hex'),
        );
        metadata.addUInt32(Tag.TAG_EXPIRES_AT, this.expiresAtSeconds);
        metadata.addUInt32(Tag.TAG_COUNTER, sessionInfo.getCounter());
        return metadata;
    }

    #getHMACBytes(): Buffer {
        const sessionInfo = this.sessionInfo;

        const hmacKey = Crypto.deriveHMACKey(
            this.sessionInfo.getSharedKey(),
            'authenticated command',
        );

        const hmacTag = Crypto.getHMACTag(
            this.metadataBytes,
            this.commandBytes,
            hmacKey,
        );

        const message: RoutableMessage = {
            toDestination: { domain: this.domain },
            fromDestination: { routingAddress: this.routingAddress },
            protobufMessageAsBytes: this.commandBytes,
            signatureData: {
                signerIdentity: {
                    publicKey: this.publicKey.toBuffer(),
                },
                HMACPersonalizedData: {
                    epoch: sessionInfo.getEpoch(),
                    counter: sessionInfo.getCounter(),
                    expiresAt: this.expiresAtSeconds,
                    tag: hmacTag,
                },
            },
            uuid: this.uuid,
        };

        console.log('message: ', message);

        return Buffer.from(RoutableMessage.encode(message).finish());
    }

    #getAESGCMBytes(): Buffer {
        const sessionInfo = this.sessionInfo;

        const { cipherText, authTag } = Crypto.encryptAESGCM(
            this.commandBytes,
            this.metadataBytes,
            sessionInfo.getSharedKey(),
            this.nonce,
        );

        this.cipherText = cipherText;
        this.authTag = authTag;

        const message: RoutableMessage = {
            toDestination: { domain: this.domain },
            fromDestination: { routingAddress: this.routingAddress },
            protobufMessageAsBytes: cipherText,
            signatureData: {
                signerIdentity: {
                    publicKey: this.publicKey.toBuffer(),
                },
                AESGCMPersonalizedData: {
                    epoch: sessionInfo.getEpoch(),
                    counter: sessionInfo.getCounter(),
                    expiresAt: this.expiresAtSeconds,
                    tag: authTag,
                    nonce: this.nonce,
                },
            },
            uuid: this.uuid,
        };

        return Buffer.from(RoutableMessage.encode(message).finish());
    }

    getNonce(): Buffer {
        return this.nonce;
    }

    getRoutingAddress(): Buffer {
        return this.routingAddress;
    }

    getUUID(): Buffer {
        return this.uuid;
    }

    getCipherText(): Buffer {
        return this.cipherText as Buffer;
    }

    getAuthTag(): Buffer {
        return this.authTag as Buffer;
    }

    getEpoch(): Buffer {
        return this.sessionInfo.getEpoch();
    }

    getExpiration(): number {
        return this.expiresAtSeconds;
    }

    getCounter(): number {
        return this.sessionInfo.getCounter();
    }

    getPublicKey(): Buffer {
        return this.sessionInfo.getPublicKey();
    }
}

export default VehicleCommand;
