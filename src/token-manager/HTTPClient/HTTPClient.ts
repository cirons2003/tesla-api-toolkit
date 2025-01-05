import axios from 'axios';
import { authorizeConfig } from './utils/authorizeConfig';
import { handleTeslaErrors } from './utils/handleTeslaErrors';
import { vehicleCache } from './vehicle/VehicleCache';

export type RequestConfig = {
    method: 'GET' | 'POST';
    headers?: any;
    data?: any;
    params?: any;
    [key: string]: any;
};

const expandConfig = (config: RequestConfig, requestUrl: string) => {
    const expandedConfig = { ...config };
    expandedConfig.baseURL = 'https://fleet-api.prd.na.vn.cloud.tesla.com';
    expandedConfig.url = requestUrl;
    return expandedConfig;
};

// throws HTTP Errors
export const HTTPClient = {
    tesla: {
        userRequest: async <T>(
            requestUrl: string,
            userId: number,
            config: RequestConfig,
        ) => {
            const expandedConfig = expandConfig(config, requestUrl);
            const authorizedConfig = await authorizeConfig(
                expandedConfig,
                userId,
            );
            try {
                return await axios.request<T>(authorizedConfig);
            } catch (err) {
                return handleTeslaErrors(err, userId);
            }
        },
        useVehicle: (vin: string) => {
            if (!vehicleCache.containsVehicle(vin)) {
                vehicleCache.addVehicle(vin);
            }
            const v = vehicleCache.getVehicle(vin);
            return v;
        },
    },
};
