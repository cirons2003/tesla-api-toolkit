import { ClientContext } from '../TeslaClient';
import SessionInfo from './objects/SessionInfo';
import axios from 'axios';
import { Domain, RoutableMessage } from './protobuf/outputs/universal_message';
import { SignatureType, Tag } from './protobuf/outputs/signatures';
import { Action } from './protobuf/outputs/car_server';
import VehicleCommand from './objects/VehicleCommand';
import { asyncErrorHandler, handleVehicleError } from './utils/errorHandling';
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

        if (domain === Domain.DOMAIN_INFOTAINMENT) {
            this.infotainmentSessionInfo = newSessionInfo;
        } else {
            this.vehicleSecuritySessionInfo = newSessionInfo;
        }
    }

    /* Reduces boilerplate */
    #getDomainSessionInfo(
        domain: Domain.DOMAIN_INFOTAINMENT | Domain.DOMAIN_VEHICLE_SECURITY,
    ) {
        if (domain === Domain.DOMAIN_INFOTAINMENT) {
            return this.infotainmentSessionInfo;
        } else {
            return this.vehicleSecuritySessionInfo;
        }
    }

    /* Reduces boilerplate */
    #domainHasSession(
        domain: Domain.DOMAIN_INFOTAINMENT | Domain.DOMAIN_VEHICLE_SECURITY,
    ) {
        if (domain === Domain.DOMAIN_INFOTAINMENT) {
            return this.hasInfotainmentSession;
        } else {
            return this.hasVehicleSecuritySession;
        }
    }

    /*
     ** Conducts a handshake with retries.
     ** Validates session info tag.
     ** If tag matches, updates session info.
     */
    async #startSession(
        domain: Domain.DOMAIN_INFOTAINMENT | Domain.DOMAIN_VEHICLE_SECURITY,
    ): Promise<void> {
        if (this.#domainHasSession(domain)) {
            return;
        }

        const uuidObject = { uuid: undefined };

        const handshakeCallback = async () =>
            await this.#issueHandshake(domain, uuidObject);

        const [maybeMessage, vehicleError] = await asyncErrorHandler(
            handshakeCallback,
            this.context.maxRetries,
            BASE_TIMEOUT,
        );

        if (!!vehicleError) {
            handleVehicleError(vehicleError);
        }

        const message = maybeMessage as RoutableMessage;

        if (!uuidObject.uuid) {
            throw new Error();
        }

        const sessionInfoBytes = message.sessionInfo;
        if (!sessionInfoBytes) {
            throw new Error();
        }
        const sessionInfo = new SessionInfo(
            Buffer.from(sessionInfoBytes),
            this.context.privateKey,
        );

        const sessionInfoTagBytes = message.signatureData?.sessionInfoTag?.tag;
        if (!sessionInfoTagBytes) {
            throw new Error();
        }
        const sessionInfoTag = Buffer.from(sessionInfoTagBytes);

        const isValid = this.#isHandshakeResponseValid(
            sessionInfo,
            sessionInfoTag,
            uuidObject.uuid,
        );

        if (!isValid) {
            throw new Error();
        }

        this.updateSessionInfo(Buffer.from(sessionInfoBytes), domain);
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

    /* Validates Session Info Tag */
    #isHandshakeResponseValid(
        sessionInfo: SessionInfo,
        sessionInfoTag: Buffer,
        uuid: Buffer,
    ): boolean {
        const sharedKey = sessionInfo.getSharedKey();

        // Check HMAC-SHA256(K, "session info")
        const sessionInfoKey = Crypto.deriveHMACKey(sharedKey, 'session info');

        // Encode metadata
        const metadata = new Metadata();
        metadata.addUInt8(
            Tag.TAG_SIGNATURE_TYPE,
            SignatureType.SIGNATURE_TYPE_HMAC,
        );
        metadata.addString(Tag.TAG_PERSONALIZATION, this.vin);
        metadata.addHexString(Tag.TAG_CHALLENGE, uuid.toString('hex'));

        const hmacTag = Crypto.getHMACTag(
            metadata.toBytes(),
            sessionInfo.getSessionInfoBytes(),
            sessionInfoKey,
        );

        // Compare with response's tag
        return Crypto.hmacTagsEqual(hmacTag, sessionInfoTag);
    }

    /* Sends a vehicle command. Throws http errors. */
    async #issueCommand(
        action: Action,
        domain: Domain.DOMAIN_INFOTAINMENT | Domain.DOMAIN_VEHICLE_SECURITY,
        secondsToExpiration: number,
    ): Promise<RoutableMessage> {
        this.#getDomainSessionInfo(domain).incrementCounter();

        const commandBytes = Buffer.from(Action.encode(action).finish());
        const vehicleCommand = new VehicleCommand(
            commandBytes,
            this.vin,
            this.context.publicKey,
            this.#getDomainSessionInfo(domain),
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
        const access_token = await this.context.getAccessToken(
            this.id,
            'vehicle',
        ); // client errors will propogate

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

    /* Honks Horn */
    async honkHorn(secondsToExpiration: number): Promise<RoutableMessage> {
        const TARGET_DOMAIN = Domain.DOMAIN_INFOTAINMENT;

        if (this.#domainHasSession(TARGET_DOMAIN)) {
            this.#startSession(TARGET_DOMAIN);
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
