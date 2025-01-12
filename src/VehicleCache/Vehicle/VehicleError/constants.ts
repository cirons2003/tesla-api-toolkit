// ERROR CODES
export enum VehicleErrorCode {
    UNKNOWN_ERROR = 0, // Default
    BAD_ACCESS_TOKEN = 1, // Issue with token handling, likely on client side
    KEY_PAIRING_ISSUE = 2, // Issue with mobile key pairing, likely on client side
    SIGNATURE_MISMATCH = 3, // Issue with signature generation, likely involving public/private keys
    BAD_SESSION = 4, // Session out of sync (recoverable)
    MISC_TRANSIENT_ERROR = 5, // Non session related transient error (recoverable)
    MISC_TERMINAL_ERROR = 6, // Not recoverable
    INTERNAL_ERROR = 7, // Likely a big in the package itself
}

export enum ProtocolErrorCode {
    SUBSYSTEM_BUSY = 1,
    DID_NOT_RESPOND = 2,
    UNRECOGNIZED_KEY = 3,
    DISABLED_KEY = 4,
    INCORRECT_SIGNATURE = 5,
    STALE_COUNTER = 6,
    UNAUTHORIZED = 7,
    UNRECOGNIZED_SUBSYSTEM = 8,
    UNRECOGNIZED_COMMAND = 9,
    COULD_NOT_PARSE_COMMAND = 10,
    UNFINISHED_BOOT = 11,
    WRONG_VIN = 12,
    DEPRECATED_PARAMETER = 13,
    KEYCHAIN_FULL = 14,
    SESSION_ID_MISMATCH = 15,
    IVL_INCORRECT = 16,
    COMMAND_EXPIRED = 17,
    VIN_NOT_FOUND = 18,
    INTERNAL_VEHICLE_ERROR = 19,
    TTL_TOO_LONG = 20,
    MOBILE_ACCESS_DISABLED = 21,
    REMOTE_SERVICE_COMMANDS_NOT_CONFIGURED = 22,
    INSECURE_CHANNEL = 23,
    REQUEST_EXCEEDS_MTU = 24,
    RESPONSE_EXCEEDS_MTU = 25,
}

export enum HttpErrorCode {
    BAD_ACCESS_TOKEN = 1,
    UNKNOWN_ERROR = 3,
}

// ERROR MESSAGES
export const protocolErrorMessages: Record<ProtocolErrorCode, string> = {
    [ProtocolErrorCode.SUBSYSTEM_BUSY]:
        'Required vehicle subsystem is busy. Try again.',
    [ProtocolErrorCode.DID_NOT_RESPOND]:
        'Vehicle subsystem did not respond. Try again.',
    [ProtocolErrorCode.UNRECOGNIZED_KEY]:
        'Vehicle did not recognize the key used to authorize command. Make sure your key is paired with the vehicle.',
    [ProtocolErrorCode.DISABLED_KEY]:
        'Key used to authorize command has been disabled.',
    [ProtocolErrorCode.INCORRECT_SIGNATURE]:
        'Command signature/MAC is incorrect. Use included session info to update session and try again.',
    [ProtocolErrorCode.STALE_COUNTER]:
        'Command anti-replay counter has been used before. Use included session info to update session and try again.',
    [ProtocolErrorCode.UNAUTHORIZED]:
        'User is not authorized to execute command. This can be because of the role or because of vehicle state.',
    [ProtocolErrorCode.UNRECOGNIZED_SUBSYSTEM]:
        'Command was malformed or addressed to an unrecognized vehicle system. May indicate client error or older vehicle firmware.',
    [ProtocolErrorCode.UNRECOGNIZED_COMMAND]:
        'Unrecognized command. May indicate client error or unsupported vehicle firmware.',
    [ProtocolErrorCode.COULD_NOT_PARSE_COMMAND]:
        'Could not parse command. Indicates client error.',
    [ProtocolErrorCode.UNFINISHED_BOOT]:
        'Internal vehicle error. Try again. Most commonly encountered when the vehicle has not finished booting.',
    [ProtocolErrorCode.WRONG_VIN]: 'Command sent to wrong VIN.',
    [ProtocolErrorCode.DEPRECATED_PARAMETER]:
        'Command was malformed or used a deprecated parameter.',
    [ProtocolErrorCode.KEYCHAIN_FULL]:
        "Vehicle's keychain is full. You must delete a key before you can add another.",
    [ProtocolErrorCode.SESSION_ID_MISMATCH]:
        'Session ID mismatch. Use included session info to update session and try again.',
    [ProtocolErrorCode.IVL_INCORRECT]:
        'Initialization Value length is incorrect (AES-GCM must use 12-byte IVs). Indicates a client programming error.',
    [ProtocolErrorCode.COMMAND_EXPIRED]:
        'Command expired. Use included session info to determine if clocks have desynchronized and try again.',
    [ProtocolErrorCode.VIN_NOT_FOUND]:
        'Vehicle has not been provisioned with a VIN and may require service.',
    [ProtocolErrorCode.INTERNAL_VEHICLE_ERROR]: 'Internal vehicle error.',
    [ProtocolErrorCode.TTL_TOO_LONG]:
        'Vehicle rejected command because its expiration time was too far in the future. This is a security precaution.',
    [ProtocolErrorCode.MOBILE_ACCESS_DISABLED]:
        'The vehicle owner has disabled Mobile access.',
    [ProtocolErrorCode.REMOTE_SERVICE_COMMANDS_NOT_CONFIGURED]:
        'The command was authorized with a Service key, but the vehicle has not been configured to permit remote service commands.',
    [ProtocolErrorCode.INSECURE_CHANNEL]:
        'The command requires proof of Tesla account credentials but was not sent over a channel that provides this proof. Resend the command using Fleet API.',
    [ProtocolErrorCode.REQUEST_EXCEEDS_MTU]:
        'Client sent a request with a field that exceeds MTU',
    [ProtocolErrorCode.RESPONSE_EXCEEDS_MTU]:
        "Client's request was received, but response size exceeded MTU",
};

export const httpErrorMessages: Record<HttpErrorCode, string> = {
    [HttpErrorCode.BAD_ACCESS_TOKEN]:
        'There was an issue with the provided access token. View details.axiosError for more details.',
    [HttpErrorCode.UNKNOWN_ERROR]:
        'An error was returned by Fleet API. View details.axiosError for more details.',
};

// VEHICLE ERROR CODES
export const protocolErrorCodes: Record<ProtocolErrorCode, VehicleErrorCode> = {
    [ProtocolErrorCode.SUBSYSTEM_BUSY]: VehicleErrorCode.MISC_TRANSIENT_ERROR, // try again
    [ProtocolErrorCode.DID_NOT_RESPOND]: VehicleErrorCode.MISC_TRANSIENT_ERROR, // try again
    [ProtocolErrorCode.UNRECOGNIZED_KEY]: VehicleErrorCode.KEY_PAIRING_ISSUE, // pair key
    [ProtocolErrorCode.DISABLED_KEY]: VehicleErrorCode.KEY_PAIRING_ISSUE, // re-pair key
    [ProtocolErrorCode.INCORRECT_SIGNATURE]:
        VehicleErrorCode.SIGNATURE_MISMATCH, // either internal or mismatching keys
    [ProtocolErrorCode.STALE_COUNTER]: VehicleErrorCode.INTERNAL_ERROR, // internal, didn't update counter
    [ProtocolErrorCode.UNAUTHORIZED]: VehicleErrorCode.MISC_TERMINAL_ERROR, // fix scopes
    [ProtocolErrorCode.UNRECOGNIZED_SUBSYSTEM]: VehicleErrorCode.INTERNAL_ERROR, // internal, bad domain
    [ProtocolErrorCode.UNRECOGNIZED_COMMAND]: VehicleErrorCode.INTERNAL_ERROR, // internal, malformed command
    [ProtocolErrorCode.COULD_NOT_PARSE_COMMAND]:
        VehicleErrorCode.INTERNAL_ERROR, // internal, malformed command
    [ProtocolErrorCode.UNFINISHED_BOOT]: VehicleErrorCode.MISC_TRANSIENT_ERROR, // try again
    [ProtocolErrorCode.WRONG_VIN]: VehicleErrorCode.BAD_ACCESS_TOKEN, // vin from access token doesnt match vin
    [ProtocolErrorCode.DEPRECATED_PARAMETER]: VehicleErrorCode.INTERNAL_ERROR, // internal, updated protocol
    [ProtocolErrorCode.KEYCHAIN_FULL]: VehicleErrorCode.KEY_PAIRING_ISSUE, // remove some keys and re-add
    [ProtocolErrorCode.SESSION_ID_MISMATCH]: VehicleErrorCode.BAD_SESSION, // session id doesn't match
    [ProtocolErrorCode.IVL_INCORRECT]: VehicleErrorCode.INTERNAL_ERROR, // shouldn't happen since we use HMAC tags
    [ProtocolErrorCode.COMMAND_EXPIRED]: VehicleErrorCode.MISC_TRANSIENT_ERROR, // try again
    [ProtocolErrorCode.VIN_NOT_FOUND]: VehicleErrorCode.MISC_TERMINAL_ERROR, // issue with vehicle most likely
    [ProtocolErrorCode.INTERNAL_VEHICLE_ERROR]:
        VehicleErrorCode.MISC_TERMINAL_ERROR, // issue with vehicle
    [ProtocolErrorCode.TTL_TOO_LONG]: VehicleErrorCode.MISC_TERMINAL_ERROR, // TTL passed by client too large
    [ProtocolErrorCode.MOBILE_ACCESS_DISABLED]:
        VehicleErrorCode.MISC_TERMINAL_ERROR, // bad consifguration
    [ProtocolErrorCode.REMOTE_SERVICE_COMMANDS_NOT_CONFIGURED]:
        VehicleErrorCode.MISC_TERMINAL_ERROR, // bad consifguration
    [ProtocolErrorCode.INSECURE_CHANNEL]: VehicleErrorCode.INTERNAL_ERROR, // shouldn't happen, we use fleet api
    [ProtocolErrorCode.REQUEST_EXCEEDS_MTU]:
        VehicleErrorCode.MISC_TRANSIENT_ERROR, // transient I think... otherwise malformed command
    [ProtocolErrorCode.RESPONSE_EXCEEDS_MTU]:
        VehicleErrorCode.MISC_TRANSIENT_ERROR, // transient I think... otherwise malformed command or vehicle error
};

export const httpErrorCodes: Record<HttpErrorCode, VehicleErrorCode> = {
    [HttpErrorCode.BAD_ACCESS_TOKEN]: VehicleErrorCode.BAD_ACCESS_TOKEN, // bad access token is only transient I think
    [HttpErrorCode.UNKNOWN_ERROR]: VehicleErrorCode.UNKNOWN_ERROR,
};
