import { AxiosError } from 'axios';
import {
    MessageFaultE,
    RoutableMessage,
} from '../protobuf/outputs/universal_message';
import {
    HttpError,
    ProtocolError,
    VehicleError,
    VehicleErrorDetails,
} from './VehicleError';
import { VehicleErrorCode } from './constants';

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
    vin: string,
    id: string,
): Promise<[RoutableMessage, null] | [null, Error]> => {
    let retryCount = 0;
    while (true) {
        const [response, error] = await asyncWrapper(callback());
        // handle http errors
        if (!!error) {
            const shouldRetry = handleHTTPError(error);
            if (!!shouldRetry) {
                // max retry count exceeded
                if (retryCount >= maxRetries) {
                    const details: VehicleErrorDetails = {
                        vin,
                        id,
                        outOfRetries: true,
                        retriesAttempted: retryCount,
                    };
                    return [null, vehicleErrorFromHTTPError(error, details)];
                }
                retryCount += 1;
                await sleep(exponentialBackoff(retryCount, baseTimeout));
                continue;
            } else {
                const details: VehicleErrorDetails = {
                    vin,
                    id,
                    outOfRetries: false,
                    retriesAttempted: retryCount,
                };
                return [null, vehicleErrorFromHTTPError(error, details)];
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
            if (retryCount >= maxRetries) {
                const details: VehicleErrorDetails = {
                    vin,
                    id,
                    outOfRetries: true,
                    retriesAttempted: retryCount,
                };
                return [
                    null,
                    vehicleErrorFromProtocolError(protocolErrorCode, details),
                ];
            }
            retryCount += 1;
            await sleep(exponentialBackoff(retryCount, baseTimeout));
            continue;
        } else {
            const details: VehicleErrorDetails = {
                vin,
                id,
                outOfRetries: false,
                retriesAttempted: retryCount,
            };
            return [
                null,
                vehicleErrorFromProtocolError(protocolErrorCode, details),
            ];
        }
    }
};

const asyncWrapper = async <T>(
    promise: Promise<T>,
): Promise<[T, null] | [null, Error]> => {
    try {
        return [await promise, null];
    } catch (err) {
        return [null, err];
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
    details: VehicleErrorDetails,
) => {
    return new ProtocolError(protocolErrorCode, details);
};

const vehicleErrorFromHTTPError = (
    err: Error,
    details: VehicleErrorDetails,
) => {
    if (err instanceof AxiosError) {
        return new HttpError(err, details);
    } else {
        return new VehicleError(
            'An Unexpected Error Occured',
            VehicleErrorCode.INTERNAL_ERROR,
            details,
        );
    }
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

export const handleVehicleError = (vehicleError: VehicleError): never => {
    throw vehicleError;
};
