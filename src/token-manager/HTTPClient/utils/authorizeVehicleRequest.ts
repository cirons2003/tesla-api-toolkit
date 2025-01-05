import { RequestConfig } from '../HTTPClient';

export const authorizeVehicleRequest = (config: RequestConfig, vehicleId) => {};

const authorizedConfig = { ...config };
const header = authorizedConfig.header ?? {};
header.Authorization = `Bearer ${authToken}`;
authorizedConfig.header = header;
return authorizedConfig;
