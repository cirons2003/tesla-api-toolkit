import {
    HttpErrorCode,
    httpErrorCodes,
    httpErrorMessages,
    ProtocolErrorCode,
    protocolErrorCodes,
    protocolErrorMessages,
    VehicleErrorCode,
} from './constants';
import { AxiosError } from 'axios';

/**
 * Vehicle Errors are the standardized error type thrown by the Vehicle object
 * @property message - A description of error.
 * @property errorCode - Actionable code from standardized enum.
 * @property details - An object with vehicle details
 * @property details.id - the unique identifier of throwing vehicle.
 * @property details.vin - the vehicle tag of throwing vehicle.
 * @property details.retriesAttempted - the number of retries attempted to resolve error.
 * @property details.outOfRetries - whether the error was thrown after reaching the retry limit.
 */
export class VehicleError extends Error {
    errorCode: VehicleErrorCode;
    details: VehicleErrorDetails;

    constructor(
        message: string,
        errorCode: VehicleErrorCode,
        details: VehicleErrorDetails,
    ) {
        super(message);
        this.errorCode = errorCode;
        this.details = details;
        this.name = 'Vehicle Error';
    }
}
export type VehicleErrorDetails = {
    id: string;
    vin: string;
    retriesAttempted: number;
    outOfRetries: boolean;
};

/**
 * Type of Vehicle Error thrown when a response is received from vehicle, but an error occured
 * @property message - A description of error.
 * @property errorCode - Actionable code from standardized enum.
 * @property details - An object with vehicle details
 * @property details.id - the unique identifier of throwing vehicle.
 * @property details.vin - the vehicle tag of throwing vehicle.
 * @property details.retriesAttempted - the number of retries attempted to resolve error.
 * @property details.outOfRetries - whether the error was thrown after reaching the retry limit.
 */
export class ProtocolError extends VehicleError {
    details: ProtocolErrorDetails;

    constructor(
        protocolErrorCode: ProtocolErrorCode,
        details: VehicleErrorDetails,
    ) {
        const message = constructProtocolMessage(protocolErrorCode, details);
        super(message, protocolErrorCodes[protocolErrorCode], details);

        this.details = { ...details, protocolErrorCode };
        this.name = 'Vehicle Error (Protocol)';
    }
}
export type ProtocolErrorDetails = VehicleErrorDetails & {
    protocolErrorCode: ProtocolErrorCode;
};

export const constructProtocolMessage = (
    protocolErrorCode: ProtocolErrorCode,
    details: VehicleErrorDetails,
): string => {
    const protocolMessage = protocolErrorMessages[protocolErrorCode];
    const headerMessage = details.outOfRetries
        ? `Error resolution incomplete. Attempted ${details.retriesAttempted} / ${details.retriesAttempted} retries. Stopped at the following error: `
        : `Could not resolve the following error: `;
    return headerMessage + protocolMessage;
};

/**
 * Type of Vehicle Error thrown when an error is thrown at the Fleet API layer
 * @property message - A description of error.
 * @property errorCode - Actionable code from standardized enum.
 * @property details - An object with vehicle details
 * @property details.id - the unique identifier of throwing vehicle.
 * @property details.vin - the vehicle tag of throwing vehicle.
 * @property details.retriesAttempted - the number of retries attempted to resolve error.
 * @property details.outOfRetries - whether the error was thrown after reaching the retry limit.
 * @property details.axiosError - instance of the AxiosError that caused the error
 */
export class HttpError extends VehicleError {
    details: HttpErrorDetails;

    constructor(axiosError: AxiosError, details: VehicleErrorDetails) {
        const httpErrorCode = getErrorCodeFromAxiosError(axiosError);

        const message = constructHttpMessage(httpErrorCode, details);

        super(message, httpErrorCodes[httpErrorCode], details);

        this.details = { ...details, axiosError };
        this.name = 'Vehicle Error (HTTP)';
    }
}
export type HttpErrorDetails = VehicleErrorDetails & { axiosError: AxiosError };

/* Maps an axios error to different types of expected errors */
const getErrorCodeFromAxiosError = (
    err: AxiosError<any, any>,
): HttpErrorCode => {
    const res = err.response;
    const errorCode = res?.status;
    if (!errorCode) {
        return HttpErrorCode.UNKNOWN_ERROR;
    }

    if (errorCode === 400 && res.data.error === 'invalid_auth_code') {
        return HttpErrorCode.BAD_ACCESS_TOKEN;
    }

    if (errorCode === 401 && !res.data) {
        return HttpErrorCode.BAD_ACCESS_TOKEN;
    }

    return HttpErrorCode.UNKNOWN_ERROR;
};

const constructHttpMessage = (
    httpErrorCode: HttpErrorCode,
    details: VehicleErrorDetails,
) => {
    const httpMessage = httpErrorMessages[httpErrorCode];
    const headerMessage = details.outOfRetries
        ? `Error resolution incomplete. Attempted ${details.retriesAttempted} retries. Stopped at the following error: `
        : `Could not resolve the following error: `;
    return headerMessage + httpMessage;
};

// Example of Usage

/*
try {
    // throws some vehicle error
} catch (err) {
    if (err! instanceof VehicleError) {
        throw err;
    }

    const error = err as VehicleError;

    console.log(error.message);
    const errorCode: VehicleErrorCode = error.errorCode;

    const retries = error.details.retriesAttempted;
    const failedFromRetries = error.details.outOfRetries;
    const vin = error.details.vin;
    const id = error.details.id;

    if (err instanceof ProtocolError) {
        console.log('Protocol Error!');
    } else if (err instanceof HttpError) {
        console.log('Http Error!');
        const axiosError = err.details.axiosError;
    } else {
        throw err;
    }
}
*/
