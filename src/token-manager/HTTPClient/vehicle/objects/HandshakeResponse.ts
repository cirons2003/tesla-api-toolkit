import { Domain, RoutableMessage } from '../protobuf/outputs/universal_message';
import SessionInfo from './SessionInfo';

export class HandshakeResponseError extends Error {
    constructor(message: string) {
        super(`Handshake Response Error: ${message}`);
    }
}

class HandshakeResponse {
    private routingAddress: Buffer;
    private domain: Domain;
    private sessionInfoTag: Buffer;
    private sessionInfo: SessionInfo;
    private requestUuid?: Buffer;

    constructor(base64Response: string) {
        const bufferResponse = Buffer.from(base64Response, 'base64');
        const routableMessage = RoutableMessage.decode(bufferResponse);
        console.log('HANDSHAKE RESPONSE: ', routableMessage);
        if (!routableMessage) {
            throw new HandshakeResponseError(
                'Could not decode routable message',
            );
        }

        if (!routableMessage.toDestination?.routingAddress) {
            throw new HandshakeResponseError(
                'Response Missing Routing Address',
            );
        }

        if (!routableMessage.fromDestination?.domain) {
            throw new HandshakeResponseError('Response Missing Domain');
        }

        if (!routableMessage.signatureData?.sessionInfoTag?.tag) {
            throw new HandshakeResponseError(
                'Response Missing Session Info Tag',
            );
        }

        if (!routableMessage.sessionInfo) {
            throw new HandshakeResponseError('Response Missing Session Info');
        }

        this.routingAddress = Buffer.from(
            routableMessage.toDestination.routingAddress,
        );
        this.domain = routableMessage.fromDestination.domain;
        this.sessionInfoTag = Buffer.from(
            routableMessage.signatureData.sessionInfoTag.tag,
        );
        this.sessionInfo = new SessionInfo(
            Buffer.from(routableMessage.sessionInfo),
        );
        if (!!routableMessage.requestUuid) {
            this.requestUuid = Buffer.from(routableMessage.requestUuid);
        }
    }

    getSessionInfo(): SessionInfo {
        return this.sessionInfo;
    }

    getSessionInfoTag(): Buffer {
        return this.sessionInfoTag;
    }
}

export default HandshakeResponse;
