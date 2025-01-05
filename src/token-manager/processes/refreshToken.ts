import axios from 'axios';
import { knexObj } from '../../database/knexObj';
import {
    AuthorizationError,
    DatabaseError,
    HttpError,
    Httpify,
    TeslaError,
} from '../../middleware/errorHandler';

export const secondsToExpiration = (timestamp: number) => {
    const currTimestamp = Math.floor(Date.now() / 1000);
    const secondsLeft = timestamp - currTimestamp;
    return secondsLeft;
};

// throws http errors
export const refreshToken = async (userId: number) => {
    const user = await knexObj('users').where('id', userId).first();
    const refresh_token = user?.tesla_refresh_token;

    if (!refresh_token) {
        throw new AuthorizationError('User had not provided a refresh token');
    }

    const client_id = process.env.CLIENT_ID;
    if (!client_id) {
        throw new HttpError(undefined, 'CLIENT_ID not defined', 500);
    }
    const params = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: client_id,
        refresh_token: refresh_token,
    });
    let response;
    try {
        response = await axios.post(
            'https://auth.tesla.com/oauth2/v3/token',
            params.toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            },
        );
    } catch (err) {
        try {
            await knexObj('users')
                .where('id', userId)
                .update({ valid_refresh_token: false });
            console.log(
                `User ${userId}'s refresh token is invalid. Please reauthenticate`,
            );
        } catch (err) {
            throw new DatabaseError(
                err,
                'Token Refresh Failed; Also Failed to update refresh token status',
            );
        }
        throw new TeslaError(err, 'Token Refresh Failed');
    }
    const { access_token } = response.data;

    try {
        await knexObj('users')
            .where('id', userId)
            .update({ tesla_access_token: access_token });
    } catch (err) {
        throw new DatabaseError(
            `Failed to update acccess_token for user ${userId}`,
        );
    }
    return access_token;
};
