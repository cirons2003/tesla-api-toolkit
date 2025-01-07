import { randomBytes } from 'crypto';
import PublicKey from '../../Keys/PublicKey';
import { Domain, RoutableMessage } from '../protobuf/outputs/universal_message';

class HandshakeRequest {
    private domain: Domain;
    private publicKey: PublicKey;
    private routing_address: Buffer; // Random 16 bytes
    private uuid: Buffer;

    constructor(uuid: Buffer, domain: Domain, publicKey: PublicKey) {
        this.domain = domain;
        this.publicKey = publicKey;
        this.routing_address = randomBytes(16);
        this.uuid = uuid;
    }

    toBase64(): string {
        const routableMessage: RoutableMessage = {
            toDestination: {
                domain: this.domain,
            },
            fromDestination: {
                routingAddress: this.routing_address,
            },
            sessionInfoRequest: {
                publicKey: this.publicKey.toBuffer(),
            },
            uuid: this.uuid,
        };

        const writer = RoutableMessage.encode(routableMessage);

        return Buffer.from(writer.finish()).toString('base64');
    }

    getUUID(): Buffer {
        return this.uuid;
    }
}

export default HandshakeRequest;
