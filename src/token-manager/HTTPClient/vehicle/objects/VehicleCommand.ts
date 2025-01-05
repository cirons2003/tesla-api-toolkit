import { randomBytes, Sign } from 'crypto';
import { SignatureType, Tag } from '../protobuf/outputs/signatures';
import Vehicle from './Vehicle';
import Crypto from './Crypto';
import Metadata from './Metadata';
import SessionInfo from './SessionInfo';
import {
    FromVCSECMessage,
    OperationStatusE as OperationStatusEVCSEC,
} from '../protobuf/outputs/vcsec';
import {
    OperationStatusE as OperationStatusECarServer,
    Response,
} from '../protobuf/outputs/car_server';
import { clientPublicKey } from '../keys';
import {
    Domain,
    MessageFaultE,
    RoutableMessage,
} from '../protobuf/outputs/universal_message';

export class VehicleCommandError extends Error {
    constructor(message: string) {
        super(`Vehicle Command Error: ${message}`);
    }
}

class VehicleCommand {
    private commandBytes: Buffer;
    private sessionInfo: SessionInfo;
    private vin: string;
    private sigType: SignatureType;
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
        vehicle: Vehicle,
        sigType: SignatureType,
        domain: Domain,
        secondsToExpiration: number,
    ) {
        if (!vehicle.isConnected()) {
            throw new VehicleCommandError(
                'Unconnected vehicles cannot form commands',
            );
        }

        /*if (
            sigType != SignatureType.SIGNATURE_TYPE_AES_GCM_PERSONALIZED &&
            sigType != SignatureType.SIGNATURE_TYPE_HMAC_PERSONALIZED
        ) {
            throw new VehicleCommandError('Unsupported signature type');
        }*/

        this.commandBytes = commandBytes;
        this.sessionInfo = vehicle.getSessionInfo();
        this.vin = vehicle.getVIN();
        this.sigType = sigType;
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

    toBytes(): Buffer {
        if (
            this.sigType == SignatureType.SIGNATURE_TYPE_HMAC_PERSONALIZED ||
            this.sigType == SignatureType.SIGNATURE_TYPE_HMAC
        ) {
            if (true || !this.cachedBytes) {
                this.cachedBytes = this.#getHMACBytes();
            }
            return this.cachedBytes;
        } else if (
            this.sigType == SignatureType.SIGNATURE_TYPE_AES_GCM_PERSONALIZED
        ) {
            if (!this.cachedBytes) {
                this.cachedBytes = this.#getAESGCMBytes();
            }
            return this.cachedBytes;
        } else {
            throw new VehicleCommandError(
                'Invalid state detected (bad sigType)',
            );
        }
    }

    toBase64(): string {
        return this.toBytes().toString('base64');
    }

    #encodeCommandMetadata(): Metadata {
        const sessionInfo = this.sessionInfo;

        const metadata = new Metadata();
        metadata.addUInt8(Tag.TAG_SIGNATURE_TYPE, this.sigType);
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
                    publicKey: clientPublicKey.toBuffer(),
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
                    publicKey: clientPublicKey.toBuffer(),
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

    getResponseStatus(response: RoutableMessage): ResponseStatus {
        let status = ResponseStatus.SUCCESS;
        if (response.signedMessageStatus?.signedMessageFault) {
            status =
                ProtocolErrorStatuses[
                    response.signedMessageStatus.signedMessageFault
                ];
            if (status !== ResponseStatus.SUCCESS) {
                return status;
            }
        }

        if (this.domain == Domain.DOMAIN_VEHICLE_SECURITY) {
            const fromVsec =
                response.protobufMessageAsBytes as FromVCSECMessage;
            if (
                fromVsec?.commandStatus?.operationStatus ==
                OperationStatusEVCSEC.OPERATIONSTATUS_WAIT
            ) {
                status = ResponseStatus.WAIT;
            }
            return status;
        }

        if (this.domain == Domain.DOMAIN_INFOTAINMENT) {
            const carResponse =
                response.protobufMessageAsBytes as unknown as Response;

            if (carResponse?.actionStatus?.result !== undefined) {
                const result = carResponse.actionStatus.result;

                if (result == OperationStatusECarServer.OPERATIONSTATUS_ERROR) {
                    status = ResponseStatus.TERMINAL_ERROR;
                }
            }
            return status;
        }

        throw new VehicleCommandError('Invalid state (domain)');
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

export enum ResponseStatus {
    SUCCESS = 0, // Succeeded
    TRY_AGAIN = 1, // Error Occurred, Try again
    WAIT = 2, // Error Occured, wait then try again
    SESSION_ERROR = 3, // Error Occured, Session out of sync, handshake and try again
    TERMINAL_ERROR = 4, // Error Occured, Additional steps must be taken before trying again
    CLIENT_ERROR = 5, // Broke protocol, issue with our code
    RETRY_LIMIT_EXCEEDED = 6, // Exceeded max number of retries
}

const ProtocolErrorStatuses: { [error in MessageFaultE]: ResponseStatus } = {
    /** MESSAGEFAULT_ERROR_NONE - Request succeeded. */
    [MessageFaultE.MESSAGEFAULT_ERROR_NONE]: ResponseStatus.SUCCESS,
    /** MESSAGEFAULT_ERROR_BUSY - Required vehicle subsystem is busy. Try again. */
    [MessageFaultE.MESSAGEFAULT_ERROR_BUSY]: ResponseStatus.TRY_AGAIN,
    /** MESSAGEFAULT_ERROR_TIMEOUT - Vehicle subsystem did not respond. Try again. */
    [MessageFaultE.MESSAGEFAULT_ERROR_TIMEOUT]: ResponseStatus.TRY_AGAIN,
    /** MESSAGEFAULT_ERROR_UNKNOWN_KEY_ID - Vehicle did not recognize the key used to authorize command. Make sure your key is paired with the vehicle. */
    [MessageFaultE.MESSAGEFAULT_ERROR_UNKNOWN_KEY_ID]:
        ResponseStatus.TERMINAL_ERROR,
    /** MESSAGEFAULT_ERROR_INACTIVE_KEY - Key used to authorize command has been disabled. */
    [MessageFaultE.MESSAGEFAULT_ERROR_INACTIVE_KEY]:
        ResponseStatus.TERMINAL_ERROR,
    /** MESSAGEFAULT_ERROR_INVALID_SIGNATURE - Command signature/MAC is incorrect. Use included session info to update session and try again. */
    [MessageFaultE.MESSAGEFAULT_ERROR_INVALID_SIGNATURE]:
        ResponseStatus.SESSION_ERROR,
    /** MESSAGEFAULT_ERROR_INVALID_TOKEN_OR_COUNTER - Command anti-replay counter has been used before. Use included session info to update session and try again. */
    [MessageFaultE.MESSAGEFAULT_ERROR_INVALID_TOKEN_OR_COUNTER]:
        ResponseStatus.SESSION_ERROR,
    /** MESSAGEFAULT_ERROR_INSUFFICIENT_PRIVILEGES - User is not authorized to execute command. This can be because of the role or because of vehicle state. */
    [MessageFaultE.MESSAGEFAULT_ERROR_INSUFFICIENT_PRIVILEGES]:
        ResponseStatus.TERMINAL_ERROR,
    /** MESSAGEFAULT_ERROR_INVALID_DOMAINS - Command was malformed or addressed to an unrecognized vehicle system. May indicate client error or older vehicle firmware. */
    [MessageFaultE.MESSAGEFAULT_ERROR_INVALID_DOMAINS]:
        ResponseStatus.CLIENT_ERROR,
    /** MESSAGEFAULT_ERROR_INVALID_COMMAND - Unrecognized command. May indicate client error or unsupported vehicle firmware. */
    [MessageFaultE.MESSAGEFAULT_ERROR_INVALID_COMMAND]:
        ResponseStatus.CLIENT_ERROR,
    /** MESSAGEFAULT_ERROR_DECODING - Could not parse command. Indicates client error. */
    [MessageFaultE.MESSAGEFAULT_ERROR_DECODING]: ResponseStatus.CLIENT_ERROR,
    /** MESSAGEFAULT_ERROR_INTERNAL - Internal vehicle error. Try again. Most commonly encountered when the vehicle has not finished booting. */
    [MessageFaultE.MESSAGEFAULT_ERROR_INTERNAL]: ResponseStatus.TRY_AGAIN,
    /** MESSAGEFAULT_ERROR_WRONG_PERSONALIZATION - Command sent to wrong VIN. */
    [MessageFaultE.MESSAGEFAULT_ERROR_WRONG_PERSONALIZATION]:
        ResponseStatus.CLIENT_ERROR,
    /** MESSAGEFAULT_ERROR_BAD_PARAMETER - Command was malformed or used a deprecated parameter. */
    [MessageFaultE.MESSAGEFAULT_ERROR_BAD_PARAMETER]:
        ResponseStatus.CLIENT_ERROR,
    /** MESSAGEFAULT_ERROR_KEYCHAIN_IS_FULL - Vehicle's keychain is full. You must delete a key before you can add another. */
    [MessageFaultE.MESSAGEFAULT_ERROR_KEYCHAIN_IS_FULL]:
        ResponseStatus.TERMINAL_ERROR,
    /** MESSAGEFAULT_ERROR_INCORRECT_EPOCH - Session ID mismatch. Use included session info to update session and try again. */
    [MessageFaultE.MESSAGEFAULT_ERROR_INCORRECT_EPOCH]:
        ResponseStatus.SESSION_ERROR,
    /** MESSAGEFAULT_ERROR_IV_INCORRECT_LENGTH - Initialization Value length is incorrect (AES-GCM must use 12-byte IVs). Indicates a client programming error. */
    [MessageFaultE.MESSAGEFAULT_ERROR_IV_INCORRECT_LENGTH]:
        ResponseStatus.CLIENT_ERROR,
    /** MESSAGEFAULT_ERROR_TIME_EXPIRED - Command expired. Use included session info to determine if clocks have desynchronized and try again. */
    [MessageFaultE.MESSAGEFAULT_ERROR_TIME_EXPIRED]:
        ResponseStatus.SESSION_ERROR,
    /** MESSAGEFAULT_ERROR_NOT_PROVISIONED_WITH_IDENTITY - Vehicle has not been provisioned with a VIN and may require service. */
    [MessageFaultE.MESSAGEFAULT_ERROR_NOT_PROVISIONED_WITH_IDENTITY]:
        ResponseStatus.TERMINAL_ERROR,
    /** MESSAGEFAULT_ERROR_COULD_NOT_HASH_METADATA - Internal vehicle error. */
    [MessageFaultE.MESSAGEFAULT_ERROR_COULD_NOT_HASH_METADATA]:
        ResponseStatus.TERMINAL_ERROR,
    /** MESSAGEFAULT_ERROR_TIME_TO_LIVE_TOO_LONG - Vehicle rejected command because its expiration time was too far in the future. This is a security precaution. */
    [MessageFaultE.MESSAGEFAULT_ERROR_TIME_TO_LIVE_TOO_LONG]:
        ResponseStatus.CLIENT_ERROR,
    /** MESSAGEFAULT_ERROR_REMOTE_ACCESS_DISABLED - The vehicle owner has disabled Mobile access. */
    [MessageFaultE.MESSAGEFAULT_ERROR_REMOTE_ACCESS_DISABLED]:
        ResponseStatus.TERMINAL_ERROR,
    /** MESSAGEFAULT_ERROR_REMOTE_SERVICE_ACCESS_DISABLED - The command was authorized with a Service key, but the vehicle has not been configured to permit remote service commands. */
    [MessageFaultE.MESSAGEFAULT_ERROR_REMOTE_SERVICE_ACCESS_DISABLED]:
        ResponseStatus.TERMINAL_ERROR,
    /** MESSAGEFAULT_ERROR_COMMAND_REQUIRES_ACCOUNT_CREDENTIALS - The command requires proof of Tesla account credentials but was not sent over a channel that provides this proof. Resend the command using Fleet API. */
    [MessageFaultE.MESSAGEFAULT_ERROR_COMMAND_REQUIRES_ACCOUNT_CREDENTIALS]:
        ResponseStatus.CLIENT_ERROR,
    [MessageFaultE.UNRECOGNIZED]: ResponseStatus.TERMINAL_ERROR,
};
