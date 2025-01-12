import { ClientContext } from '../VehicleCache';
import SessionInfo from './objects/SessionInfo';
import axios from 'axios';
import { Domain, RoutableMessage } from './protobuf/outputs/universal_message';
import { SignatureType, Tag } from './protobuf/outputs/signatures';
import { Action } from './protobuf/outputs/car_server';
import VehicleCommand from './objects/VehicleCommand';
import {
    asyncErrorHandler,
    handleVehicleError,
    VehicleError,
} from './VehicleError/utils';
import HandshakeRequest from './objects/HandshakeRequest';
import Metadata from './objects/Metadata';
import Crypto from './objects/Crypto';
import { randomBytes } from 'crypto';

const BASE_TIMEOUT = 1000;

class Vehicle {
    private vin: string;
    private id: string;
    private context: ClientContext;
    private hasInfotainmentSession: boolean = false;
    private hasVehicleSecuritySession: boolean = false;
    private infotainmentSessionInfo: SessionInfo = {} as SessionInfo;
    private vehicleSecuritySessionInfo: SessionInfo = {} as SessionInfo;

    constructor(vin: string, id: string, context: ClientContext) {
        this.vin = vin;
        this.id = id;
        this.context = context;
    }

    /* Exposed to allow for session updates in error handling */
    updateSessionInfo(
        sessionInfoBytes: Buffer,
        domain: Domain.DOMAIN_INFOTAINMENT | Domain.DOMAIN_VEHICLE_SECURITY,
    ): void {
        const newSessionInfo = new SessionInfo(
            sessionInfoBytes,
            this.context.privateKey,
        );

        // Maybe validate tag? Probably not needed...

        if (domain === Domain.DOMAIN_INFOTAINMENT) {
            this.infotainmentSessionInfo = newSessionInfo;
        } else {
            this.vehicleSecuritySessionInfo = newSessionInfo;
        }
    }

    /* Reduces boilerplate */
    #getDomainSession(domain: Domain) {
        if (domain === Domain.DOMAIN_INFOTAINMENT) {
            return {
                hasSession: this.hasInfotainmentSession,
                sessionInfo: this.infotainmentSessionInfo,
            };
        } else {
            return {
                hasSession: this.hasVehicleSecuritySession,
                sessionInfo: this.vehicleSecuritySessionInfo,
            };
        }
    }

    /*
     ** Conducts a handshake with retries.
     ** Validates session info tag.
     ** If tag matches, updates session info.
     **
     ** Returns either a VehicleError or a RoutableMessage.
     ** If a session already exists returns undefined instead of RoutableMessage.
     **
     ** Response in format [result, error]
     */
    async #startSession(
        domain: Domain.DOMAIN_INFOTAINMENT | Domain.DOMAIN_VEHICLE_SECURITY,
    ): Promise<[null, VehicleError] | [RoutableMessage | undefined, null]> {
        if (this.#getDomainSession(domain).hasSession) {
            return [undefined, null];
        }

        const uuidObject = { uuid: undefined };

        const handshakeCallback = async () =>
            await this.#issueHandshake(domain, uuidObject);

        // Conduct handshake
        const [maybeMessage, vehicleError] = await asyncErrorHandler(
            handshakeCallback,
            this.context.maxRetries,
            BASE_TIMEOUT,
        );

        if (!!vehicleError) {
            handleVehicleError(vehicleError);
        }

        const message = maybeMessage as RoutableMessage;

        // Should never be undefined
        if (!uuidObject.uuid) {
            const error = new Error();
            handleVehicleError(error);
            return [null, error];
        }

        // Should never be undefined since we already handled http & protocol errors
        const sessionInfoBytes = message.sessionInfo;
        if (!sessionInfoBytes) {
            const error = new Error();
            handleVehicleError(error);
            return [null, error];
        }

        const sessionInfo = new SessionInfo(
            Buffer.from(sessionInfoBytes),
            this.context.privateKey,
        );

        // Should never be undefined since we already handled http & protocol errors
        const sessionInfoTagBytes = message.signatureData?.sessionInfoTag?.tag;
        if (!sessionInfoTagBytes) {
            const error = new Error();
            handleVehicleError(error);
            return [null, error];
        }
        const sessionInfoTag = Buffer.from(sessionInfoTagBytes);

        const isValid = Crypto.isHandshakeResponseValid(
            sessionInfo,
            sessionInfoTag,
            uuidObject.uuid,
            this.vin,
        );

        // This means signature was not correct. We can't verify the integrity of the response.
        if (!isValid) {
            const error = new Error();
            handleVehicleError(error);
            return [null, error];
        }

        this.updateSessionInfo(Buffer.from(sessionInfoBytes), domain);
        return [message, null];
    }

    /* Sends a handshake. Throws http errors */
    async #issueHandshake(
        domain: Domain,
        uuidObject: { uuid?: Buffer },
    ): Promise<RoutableMessage> {
        uuidObject.uuid = randomBytes(16); // a bit hacky haha
        const handshakeRequest = new HandshakeRequest(
            uuidObject.uuid,
            domain,
            this.context.publicKey,
        );
        return await this.#send(handshakeRequest.toBase64());
    }

    /* Sends a vehicle command. Throws http errors. */
    async #issueCommand(
        action: Action,
        domain: Domain.DOMAIN_INFOTAINMENT | Domain.DOMAIN_VEHICLE_SECURITY,
        secondsToExpiration: number,
    ): Promise<RoutableMessage> {
        this.#getDomainSession(domain).sessionInfo.incrementCounter();

        const commandBytes = Buffer.from(Action.encode(action).finish());
        const vehicleCommand = new VehicleCommand(
            commandBytes,
            this.vin,
            this.context.publicKey,
            this.#getDomainSession(domain).sessionInfo,
            domain,
            secondsToExpiration,
        );

        return await this.#send(vehicleCommand.toBase64());
    }

    /*
     ** Sends a base64 routable message to the vehicle
     **
     ** Returns the response as a routable message.
     **
     ** Throws Http Errors.
     */
    async #send(routableBase64: string): Promise<RoutableMessage> {
        const access_token = await this.context.getAccessToken(this.id); // client errors will propogate

        const config: RequestConfig = {
            method: 'POST',
            baseUrl: 'https://fleet-api.prd.na.vn.cloud.tesla.com',
            url: `api/1/vehicles/${this.vin}/signed_command`,
            data: routableBase64,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${access_token}`,
            },
        };

        const response = await axios.request(config);

        return RoutableMessage.decode(response.data.response);
    }

    /**
     * Honks the vehicle's horn. (Targets Infotainment domain).
     * @param secondsToExpiration - Number of seconds until command should expire.
     * @returns A RoutableMessage response from the vehicle.
     */
    async honkHorn(secondsToExpiration: number): Promise<RoutableMessage> {
        const TARGET_DOMAIN = Domain.DOMAIN_INFOTAINMENT;

        if (!this.#getDomainSession(TARGET_DOMAIN).hasSession) {
            const [_, error] = await this.#startSession(TARGET_DOMAIN);
            if (!!error) {
                throw error;
            }
        }

        const callback = async () =>
            this.#issueCommand(
                {
                    vehicleAction: { vehicleControlHonkHornAction: {} },
                },
                TARGET_DOMAIN,
                secondsToExpiration,
            );

        const [message, vehicleError] = await asyncErrorHandler(
            callback,
            this.context.maxRetries,
            BASE_TIMEOUT,
        );

        if (vehicleError !== null) {
            handleVehicleError(vehicleError);
            throw vehicleError;
        }

        return message as RoutableMessage;
    }
    /* Will add the rest of the functions here... */
}

export default Vehicle;

type RequestConfig = {
    method: 'GET' | 'POST';
    headers?: any;
    data?: any;
    params?: any;
    [key: string]: any;
};
