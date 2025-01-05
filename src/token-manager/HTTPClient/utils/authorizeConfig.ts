import { getTeslaAccessToken } from '../../../database/utils/getTeslaAccessToken';
import {
    AuthorizationError,
    DatabaseError,
} from '../../../middleware/errorHandler';
import { RequestConfig } from '../HTTPClient';

// throws http errors
export const authorizeConfig = async (
    config: RequestConfig,
    user_id: number,
) => {
    try {
        const access_token = await getTeslaAccessToken(user_id);
        const authorizedConfig = { ...config };
        if (!authorizedConfig.headers) {
            authorizedConfig.headers = {};
        }
        authorizedConfig.headers.Authorization = `Bearer ${access_token}`;
        authorizedConfig.headers['Content-Type'] = 'application/json';
        return authorizedConfig;
    } catch (err) {
        if (err instanceof DatabaseError) {
            throw err;
        } else {
            throw new AuthorizationError(err, 'Failed to Authorize Request');
        }
    }
};
