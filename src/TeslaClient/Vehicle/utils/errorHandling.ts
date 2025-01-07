import { AxiosError } from 'axios';
import {
    MessageFaultE,
    RoutableMessage,
} from '../protobuf/outputs/universal_message';

const protocolErrorMessages = {
    0: 'Request succeeded.',
    1: 'Required vehicle subsystem is busy. Try again.',
    2: 'Vehicle subsystem did not respond. Try again.',
    3: 'Vehicle did not recognize the key used to authorize command. Make sure your key is paired with the vehicle.',
    4: 'Key used to authorize command has been disabled.',
    5: 'Command signature/MAC is incorrect. Use included session info to update session and try again.',
    6: 'Command anti-replay counter has been used before. Use included session info to update session and try again.',
    7: 'User is not authorized to execute command. This can be because of the role or because of vehicle state.',
    8: 'Command was malformed or addressed to an unrecognized vehicle system. May indicate client error or older vehicle firmware.',
    9: 'Unrecognized command. May indicate client error or unsupported vehicle firmware.',
    10: 'Could not parse command. Indicates client error.',
    11: 'Internal vehicle error. Try again. Most commonly encountered when the vehicle has not finished booting.',
    12: 'Command sent to wrong VIN.',
    13: 'Command was malformed or used a deprecated parameter.',
    14: "Vehicle's keychain is full. You must delete a key before you can add another.",
    15: 'Session ID mismatch. Use included session info to update session and try again.',
    16: 'Initialization Value length is incorrect (AES-GCM must use 12-byte IVs). Indicates a client programming error.',
    17: 'Command expired. Use included session info to determine if clocks have desynchronized and try again.',
    18: 'Vehicle has not been provisioned with a VIN and may require service.',
    19: 'Internal vehicle error.',
    20: 'Vehicle rejected command because its expiration time was too far in the future. This is a security precaution.',
    21: 'The vehicle owner has disabled Mobile access.',
    22: 'The command was authorized with a Service key, but the vehicle has not been configured to permit remote service commands.',
    23: 'The command requires proof of Tesla account credentials but was not sent over a channel that provides this proof. Resend the command using Fleet API.',
    24: 'Client sent a request with a field that exceeds MTU',
    25: "Client's request was received, but response size exceeded MTU",
};

/*
 ** Takes in an async function, and calls it.
 **
 ** If an error occurs, attempts to handle errors.
 **
 ** Returns the RoutableMessage and a VehicleError (undefined if none exist) as an array.
 */
export const asyncErrorHandler = async (
    callback: () => Promise<RoutableMessage>,
    maxRetries: number,
    baseTimeout: number,
): Promise<[RoutableMessage, null] | [null, VehicleError]> => {
    let retryCount = 0;
    while (true) {
        const [response, error] = await asyncWrapper(callback());
        // handle http errors
        if (!!error) {
            const shouldRetry = handleHTTPError(error);
            if (!!shouldRetry) {
                retryCount += 1;
                // max retry count exceeded
                if (retryCount > maxRetries) {
                    return [null, vehicleErrorFromHTTPError(error, true)];
                }
                await sleep(exponentialBackoff(retryCount, baseTimeout));
                continue;
            } else {
                return [null, vehicleErrorFromHTTPError(error)];
            }
        }
        const protocolErrorCode = getProtocolErrorCode(
            response.signedMessageStatus?.signedMessageFault,
        );

        // handle good responses!
        if (protocolErrorCode == ProtocolErrorCode.NONE) {
            return [response, null];
        }
        // handle protocol errors
        const shouldRetry = handleProtocolError(protocolErrorCode);
        if (!!shouldRetry) {
            retryCount += 1;
            if (retryCount > maxRetries) {
                return [
                    null,
                    vehicleErrorFromProtocolError(protocolErrorCode, true),
                ];
            }
            await sleep(exponentialBackoff(retryCount, baseTimeout));
            continue;
        } else {
            return [
                null,
                vehicleErrorFromProtocolError(protocolErrorCode, false),
            ];
        }
    }
};

const sleep = (timeout: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, timeout));
};

export const exponentialBackoff = (retryCount: number, baseTimeout: number) => {
    return baseTimeout * Math.pow(2, retryCount - 1);
};

const vehicleErrorFromProtocolError = (
    protocolErrorCode: number,
    outOfRetries: boolean = false,
) => {
    return protocolErrorCode as unknown as VehicleError;
};

const vehicleErrorFromHTTPError = (
    err: Error,
    outOfRetries: boolean = false,
) => {
    return err as VehicleError;
};

/*
 ** Attempts to resolve http errors.
 **
 ** Returns true if request should be retried
 ** Returns false if not.
 */
const handleHTTPError = (e: Error): boolean => {
    if (!(e instanceof AxiosError)) {
        return false;
    }

    const res = e.response;

    const errorCode = res?.status;
    if (!errorCode) {
        return false;
    }

    if (errorCode === 400 && res.data.error === 'invalid_auth_code') {
        // refresh token
        return true;
    }

    if (errorCode === 401 && !res.data) {
        // refresh token
        return true;
    }

    return false;
};

/*
 ** Attempts to resolve protocol errors.
 **
 ** Returns true if request should be retried
 ** Returns false if not.
 */
const handleProtocolError = (protocolErrorCode: ProtocolErrorCode) => {
    if (protocolErrorCode === ProtocolErrorCode.RETRY) {
        return true;
    }

    if (protocolErrorCode === ProtocolErrorCode.SESSION_OUT_OF_SYNC) {
        // Resolve session
        return true;
    }

    if (
        protocolErrorCode === ProtocolErrorCode.INTERNAL_ERROR ||
        protocolErrorCode === ProtocolErrorCode.UNKNOWN_ERROR
    ) {
        // Log this... might need to fix code.
        return false;
    }

    return false;
};

enum ProtocolErrorCode {
    NONE = 0,
    RETRY = 1,
    SESSION_OUT_OF_SYNC = 2,
    INTERNAL_ERROR = 3,
    KEY_PAIRING_ISSUE = 4,
    INSUFFICIENT_PRIVILEGES = 5,
    INCORRECT_VIN = 6,
    TTL_TOO_LONG = 7,
    VEHICLE_MISSING_VIN = 8,
    UNKNOWN_ERROR = 9,
}

const getProtocolErrorCode = (code?: MessageFaultE): ProtocolErrorCode => {
    if (!code) {
        return ProtocolErrorCode.NONE;
    }

    const retryCodes = [1, 2, 11, 19];
    if (retryCodes.includes(code)) {
        return ProtocolErrorCode.RETRY;
    }

    const sessionIssueCodes = [5, 6, 15, 17, 26];
    if (sessionIssueCodes.includes(code)) {
        return ProtocolErrorCode.SESSION_OUT_OF_SYNC;
    }

    const clientIssueCodes = [8, 9, 10, 16, 26, 13, 23, 24, 25, 27, 28];
    if (clientIssueCodes.includes(code)) {
        return ProtocolErrorCode.INTERNAL_ERROR;
    }

    const keyPairingCodes = [3, 4, 14, 21, 22];
    if (keyPairingCodes.includes(code)) {
        return ProtocolErrorCode.KEY_PAIRING_ISSUE;
    }

    const insufficientPriviledgeCode = 7;
    if (code == insufficientPriviledgeCode) {
        return ProtocolErrorCode.INSUFFICIENT_PRIVILEGES;
    }

    const incorrectVINCode = 12;
    if (code == incorrectVINCode) {
        return ProtocolErrorCode.INCORRECT_VIN;
    }

    const badExpirationCode = 20;
    if (code == badExpirationCode) {
        return ProtocolErrorCode.TTL_TOO_LONG;
    }

    const noVinCode = 18;
    if (code == noVinCode) {
        return ProtocolErrorCode.VEHICLE_MISSING_VIN;
    }

    return ProtocolErrorCode.UNKNOWN_ERROR;
};

export type VehicleErrorDetails = {};
export class VehicleError extends Error {
    details?: VehicleErrorDetails;

    constructor(message: string, details?: VehicleErrorDetails) {
        super(message);
        this.details = details;

        Object.setPrototypeOf(this, VehicleError.prototype);
    }
}

const asyncWrapper = async <T>(
    promise: Promise<T>,
): Promise<[T, null] | [null, Error]> => {
    try {
        return [await promise, null];
    } catch (err) {
        return [null, err];
    }
};

export const handleVehicleError = (vehicleError: VehicleError): never => {
    throw vehicleError;
};
