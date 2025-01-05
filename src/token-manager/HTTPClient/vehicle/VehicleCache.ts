import Vehicle from './objects/Vehicle';

const MAX_RETRIES = 1;

class VehicleCache {
    private vehicles: Map<string, Vehicle>;

    constructor() {
        this.vehicles = new Map<string, Vehicle>();
    }

    containsVehicle(vin: string): boolean {
        return this.vehicles.has(vin);
    }

    addVehicle(vin: string) {
        if (this.vehicles.has(vin)) {
            return;
        }
        this.vehicles.set(vin, new Vehicle(vin));
    }

    getVehicle(vin: string): Vehicle {
        if (!this.containsVehicle(vin)) {
            this.addVehicle(vin);
        }

        const vehicle = this.vehicles.get(vin) as Vehicle;
        /*let retryCount = 0;
        while (retryCount < MAX_RETRIES && !vehicle.isConnected()) {
            retryCount += 1;
            this.#refreshVehicle(vehicle);
        }*/

        /*if (!vehicle.isConnected()) {
            return undefined;
        }*/ return vehicle;
    }

    #refreshVehicle(vehicle: Vehicle) {
        vehicle.startSession();
    }
}

export const vehicleCache = new VehicleCache();
