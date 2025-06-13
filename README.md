# Tesla Api Toolkit
This package simplifies the use of Tesla's end to end communication protocol to issue vehicle commands.
The package provides a clean interface for issuing vehicle commands and a consistent error format. 

## We handle: 
- Command encoding and encryption
- Session handling and resyncing
- Response verification
- Error Handling and retries
- Response decoding

## You handle:
- Oauth authentication flow
- Database operations
- Business logic
- That's It!!

## How to use

### Implement token retrieval and refreshes based on vehicle identifiers, and provide PEM formatted key pairs
```typescript
const privateKeyPEM = 'key1'; 
const publicKeyPEM = 'key2';
const getAccessToken = async (id: string): string => {
    // Custom logic to retrieve the access token
    return 'access_token';
};
const refreshAccessToken = async (id: string): string => {
    // Custom logic to refresh the access token
    return 'access_token';
};
```

### Import VehicleCache and initialize
```typescript
import { VehicleCache } from '<Package-Name>';

const vehicleCache = new VehicleCache(
    publicKeyPEM,
    privateKeyPEM,
    getAccessToken,
    refreshAccessToken,
);
```

### Add vehicles into the VehicleCache using unique identifier 
```typescript 
// VehicleCache maintains vehicle sessions
const vin1 = 'something';
const vehicle1 = vehicleCache.ensureVehicle('v1', vin1);
vehicle1.honkHorn(7);
```

### Issue commands and catch errors!
```typescript 
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

```

## For Questions and Suggestions
Contact Carson Irons at:
- 714-402-6738  
- carsonirons@gmail.com


