import axios, { AxiosError } from 'axios';
import {
    AuthorizationError,
    TeslaError,
} from '../../../middleware/errorHandler';
import { knexObj } from '../../../database/knexObj';

export const handleTeslaErrors = (
    err: any,
    userId: number,
    vehicleId?: number,
): never => {
    if (!axios.isAxiosError(err)) {
        throw new TeslaError(err);
    }

    const status = err.status;

    if (status === 401) {
        handleInvalidAccessTokenErrors(err, userId);
        throw new TeslaError(err, 'Tesla responsed with an unknown 401 error');
    }
    if (status === 403) {
        handleUnpairedKeyErrors(err, vehicleId);
        throw new TeslaError(err, 'Tesla responsed with an unknown 403 error');
    }

    throw new TeslaError(err);
};

// Only occurs during vehicle request
// If detected, update paired_key status for vehicle
// throws custom http error
const handleUnpairedKeyErrors = (err: AxiosError, vehicleId?: number) => {
    if (!vehicleId) {
        throw new AuthorizationError(
            err,
            'Unpaired Key Error detected, but no vehicleId detected',
        );
    }

    // update paired_key status
    try {
        knexObj('vehicles')
            .where('id', vehicleId)
            .first()
            .update({ pairedKey: false });
    } catch (err) {
        throw new AuthorizationError(
            'Unpaired Key Error detected, but failed to update paired_key status',
        );
    }

    throw new AuthorizationError(
        'Unpaired Key Error detected, properly updated paired_key status',
    );
};

const handleInvalidAccessTokenErrors = async (
    err: AxiosError,
    userId: number,
) => {
    try {
        await knexObj('users')
            .where('id', userId)
            .first()
            .update({ valid_refresh_token: false });
        throw new AuthorizationError(
            err,
            'Invalid Access Token detected, likely caused by a bad refresh token. Successfully flagged refresh token',
        );
    } catch (err) {
        throw new AuthorizationError(
            err,
            'Invalid Access Token detected, likely caused by a bad refresh token. Failed to flag refresh token ',
        );
    }
};
