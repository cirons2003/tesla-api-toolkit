class Vehicle {
    vin: string;
    context: ClientContext;
    constructor(vin: string, id: string, context: ClientContext) {
        this.vin = vin;
        this.context = context;
    }
}

type ClientContext = {};

export enum CacheErrorCode {
    VehicleAlreadyExists = 1,
    VehicleDoesNotExist = 2,
}

type CacheErrorDetails = {
    id?: string; // Identifier for vehicle as passed in args
    vin?: string; // VIN for vehicle as passed in args
};

export class CacheError extends Error {
    errorCode: CacheErrorCode;
    details?: CacheErrorDetails;

    constructor(
        errorCode: CacheErrorCode,
        message: string,
        details?: CacheErrorDetails,
    ) {
        super(message);
        this.name = 'CacheError';
        this.errorCode = errorCode;
        this.details = details;

        Object.setPrototypeOf(this, CacheError.prototype);
    }
}

export class VehicleCache {
    private context: ClientContext;
    private cache: Map<string, Vehicle>;

    constructor(context: ClientContext) {
        this.context = context;
        this.cache = new Map<string, Vehicle>();
    }

    /* Returns Number of Vehicles in the Cache */
    getVehicleCount(): number {
        return this.cache.size;
    }

    /*
     ** Adds a new vehicle to the cache with unique identifier id,
     ** and VIN vin.
     **
     ** If vehicle already exists within the cache, throws a CacheError.
     */
    addVehicle(id: string, vin: string): Vehicle {
        if (this.cache.has(id)) {
            const message = `Vehicle with id '${id}' already exists. Use ensureVehicle or overrideVehicle.`;
            throw new CacheError(CacheErrorCode.VehicleAlreadyExists, message, {
                id,
                vin,
            });
        }

        const vehicle = new Vehicle(vin, id, this.context);
        this.cache.set(id, vehicle);
        return vehicle;
    }

    /*
     ** Adds a new Vehicle to the cache with unique identifier id,
     ** and VIN vin. Returns said vehicle.
     **
     ** If vehicle already exists within the cache, leaves cache unchanged
     ** and returns the vehicle with identifier id.
     */
    ensureVehicle(id: string, vin: string): Vehicle {
        if (this.cache.has(id)) {
            return this.cache.get(id) as Vehicle;
        }
        const vehicle = new Vehicle(vin, id, this.context);
        this.cache.set(id, vehicle);
        return vehicle;
    }

    /*
     ** Adds a new Vehicle to the cache with unique identifier id,
     ** and VIN vin.
     **
     ** If vehicle already exists within the cache, overrides it.
     **
     ** Returns the newly added vehicle.
     */
    overrideVehicle(id: string, vin: string): Vehicle {
        const vehicle = new Vehicle(vin, id, this.context);
        this.cache.set(id, vehicle);
        return vehicle;
    }

    /*
     ** Returns true if a vehicle with the uniqueidentifier id
     ** exists within the cache.
     **
     ** Else, return false.
     */
    containsVehicle(id: string): boolean {
        return this.cache.has(id);
    }

    /*
     ** Returns the vehicle with the unique identifier id.
     ** If no such vehicle exists, throws a CacheError.
     */
    getVehicle(id: string): Vehicle {
        const vehicle = this.cache.get(id) as Vehicle;
        if (!vehicle) {
            const message = `Vehicle with id '${id}' not found in the cache.`;
            throw new CacheError(CacheErrorCode.VehicleDoesNotExist, message, {
                id,
            });
        }

        return vehicle;
    }
}
