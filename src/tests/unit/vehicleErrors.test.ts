import { AxiosError } from 'axios';
import {
    HttpErrorCode,
    httpErrorCodes,
    ProtocolErrorCode,
    protocolErrorCodes,
    VehicleErrorCode,
} from '../../VehicleCache/Vehicle/VehicleError/constants';
import {
    HttpError,
    HttpErrorDetails,
    ProtocolError,
    ProtocolErrorDetails,
    VehicleError,
    VehicleErrorDetails,
} from '../../VehicleCache/Vehicle/VehicleError/VehicleError';

describe('Vehicle Error', () => {
    it('Should work', () => {
        const details = {} as VehicleErrorDetails;
        const errorCode = 1;
        const err = new VehicleError(
            'Error!',
            VehicleErrorCode.UNKNOWN_ERROR,
            details,
        );

        expect(err.message).toBe('Error!');
        expect(err.errorCode).toBe(VehicleErrorCode.UNKNOWN_ERROR);
        expect(err instanceof VehicleError).toBe(true);
    });
});

describe('Protocol Error', () => {
    it('Should work', () => {
        const details = {
            retriesAttempted: 2,
            outOfRetries: true,
        } as ProtocolErrorDetails;
        const err = new ProtocolError(
            ProtocolErrorCode.INCORRECT_SIGNATURE,
            details,
        );

        expect(err.errorCode).toBe(
            protocolErrorCodes[ProtocolErrorCode.INCORRECT_SIGNATURE],
        );
        expect(err instanceof ProtocolError).toBe(true);
        expect(err instanceof VehicleError).toBe(true);
    });
});

describe('HTTP Error', () => {
    it('Should work', () => {
        const details = {
            retriesAttempted: 2,
            outOfRetries: true,
        } as HttpErrorDetails;
        const axiosError = {
            res: { data: { error: 'invalid_auth_code' }, status: 400 },
        } as unknown as AxiosError;
        const err = new HttpError(axiosError, details);

        expect(err.errorCode).toBe(
            httpErrorCodes[HttpErrorCode.BAD_ACCESS_TOKEN],
        );
        expect(err instanceof HttpError).toBe(true);
        expect(err instanceof VehicleError).toBe(true);
    });
});
