import PrivateKey from './Keys/PrivateKey';
import PublicKey from './Keys/PublicKey';
import Vehicle from './Vehicle/Vehicle';

export type ClientContext = {
    publicKey: PublicKey;
    privateKey: PrivateKey;
    getAccessToken: (id: string) => Promise<string>;
    refreshAccessToken: (id: string) => Promise<string>;
    maxRetries: number;
};

/**
 * - VehicleCache is a factory for creating Vehicle Objects.
 * - A Vehicle Object is used to send commands to a single vehicle.
 * - VehicleCache ensures that sessions are preserved across commands and uses unique ids to organize vehicles.
 * - The client must keep track of identifiers, as a vehicle's access tokens must be accessible via identifier.
 * - It is recommended to only send commands to a vehicle from a single Vehicle Object.
 * - Too many instances communicating with the same vehicle will increase latency as sessions must be restarted frequently.
 */
export class VehicleCache {
    private context: ClientContext;
    private cache: Map<string, Vehicle>;
    /**
     * Creates a new VehicleCache object, with context from the client.
     * @param publicKey - The PEM representation of the client's public key.
     * @param privateKey - The PEM representation of the client's private key.
     * @param getAccessToken - A function used to fetch a vehicle's access token by id.
     * @param refreshAccessToken - A function used to refresh a vehicle's access token by id.
     * @param maxRetries - Max number of retries for internal error handling on a single command. (3 is recommended).
     */
    constructor(
        publicKeyPEM: string,
        privateKeyPEM: string,
        getAccessToken: (id: string) => Promise<string>,
        refreshAccessToken: (id: string) => Promise<string>,
        maxRetries: number = 3,
    ) {
        this.context = {
            publicKey: PublicKey.fromPem(publicKeyPEM),
            privateKey: new PrivateKey(privateKeyPEM),
            getAccessToken,
            refreshAccessToken,
            maxRetries,
        };
        this.cache = new Map<string, Vehicle>();
    }

    /**
     * Returns the number of vehicles in the cache.
     * @returns the number of vehicles in the cache
     */
    getVehicleCount(): number {
        return this.cache.size;
    }

    /**
     * Adds a new Vehicle to the cache. If vehicle already exists within the cache,
     * leaves cache unchanged and returns the existing vehicle.
     * @param id - A unique identifier for the vehicle.
     * @param vin - The vehicle's vehicle tag.
     * @returns A Vehicle object for this vehicle.
     */
    ensureVehicle(id: string, vin: string): Vehicle {
        if (this.cache.has(id)) {
            return this.cache.get(id) as Vehicle;
        }
        const vehicle = new Vehicle(vin, id, this.context);
        this.cache.set(id, vehicle);
        return vehicle;
    }

    /**
     * Adds a new Vehicle to the cache. If vehicle already exists within the cache,
     * overrides it.
     * @param id - A unique identifier for the vehicle.
     * @param vin - The vehicle's vehicle tag.
     * @returns A Vehicle object for this vehicle.
     */
    overrideVehicle(id: string, vin: string): Vehicle {
        const vehicle = new Vehicle(vin, id, this.context);
        this.cache.set(id, vehicle);
        return vehicle;
    }

    /**
     * Checks whether the cache already contains a given vehicle.
     * @param id - The vehicle's unique identifier.
     * @returns True if the cache contains the vehicle. Otherwise False.
     */
    containsVehicle(id: string): boolean {
        return this.cache.has(id);
    }

    /**
     * Gets a vehicle from the cache. If it isn't in cache, returns undefined.
     * @param id - The vehicle's unique identifier.
     * @returns A Vehicle object for the target vehicle. Or undefined if none exist.
     */
    getVehicle(id: string): Vehicle | undefined {
        return this.cache.get(id) as Vehicle;
    }

    /**
     * Removes a vehicle from the cache.
     * @param id - The vehicle's unique identifier.
     * @returns true if successful, false if vehicle does not exist.
     */
    removeVehicle(id: string): boolean {
        return this.cache.delete(id);
    }
}
