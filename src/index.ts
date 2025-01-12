import { VehicleError } from './VehicleCache/Vehicle/VehicleError/utils';
import Vehicle from './VehicleCache/Vehicle/Vehicle';
import { VehicleCache } from './VehicleCache/VehicleCache';

// Initialize VehicleCache
const privateKeyPEM = 'key1';
const publicKeyPEM = 'key2';
const getAccessToken = async (id: string) => {
    // Custom logic to retrieve the access token
    return 'access_token';
};
const refreshAccessToken = async (id: string) => {
    // Custom logic to refresh the access token
    return 'access_token';
};

const vehicleCache = new VehicleCache(
    publicKeyPEM,
    privateKeyPEM,
    getAccessToken,
    refreshAccessToken,
);

// VehicleCache maintains vehicle sessions
const vin1 = 'something';
const vehicle1 = vehicleCache.ensureVehicle('v1', vin1);
vehicle1.honkHorn(7);

// Use an existing vehicle
if (!vehicleCache.containsVehicle('v1')) {
    throw new Error('Some error');
}
const reusedVehicle1 = vehicleCache.getVehicle('v1') as Vehicle;
try {
    reusedVehicle1.honkHorn(7);
} catch (err) {
    // err will contain documented error codes for proper handling
    // err will also contain a description of the error
    if (err instanceof VehicleError) {
        // handle vehicle error
    } else {
        throw err;
    }
}
