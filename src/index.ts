import { TeslaClient, VehicleError, PersonError } from 'tesla-api-toolkit';

// Initialize TeslaClient
const privateKey = 'key1';
const publicKey = 'key2';
const getAccessToken = async (id: string, type: 'person' | 'vehicle') => {
    // Custom logic to retrieve the access token
};
const refreshAccessToken = async (id: string, type: 'person' | 'vehicle') => {
    // Custom logic to refresh the access token
};

const tk = new TeslaClient({ privateKey, publicKey, getAccessToken, refreshAccessToken });

// Vehicle Cache maintains vehicle sessions
const vehicleCache = tk.vehicleCache;
const vin1 = 'something'
const vehicle1 = vehicleCache.addVehicle('v1', vin1);
vehicle1.honkHorn();

// Use a vehicle
if (!vehicleCache.containsVehicle('v1')) {
    vehicle1.addVehicle('v1', vin1);
}
const reusedVehicle1 = vehicleCache.getVehicle('v1');
try {
    reusedVehicle1.honkHorn();
} catch (err: VehicleError) {
    // err will contain documented error codes for proper handling
    // err will also contain a description of the error
}

// Work with a Person
const me = tk.createPerson('myId'); // new Person object to issue commands
try {
    console.log('My info is: ', await me.getAccountInfo());
} catch (err: PersonError) {
    // err will contain documented error codes for proper handling
    // err will also contain a description of the error
}
