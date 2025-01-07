import Crypto from './Crypto';
import PublicKey from '../../Keys/PublicKey';
import { SessionInfo as SessionInfoProtobuf } from '../protobuf/outputs/signatures';
import PrivateKey from '../../Keys/PrivateKey';

class SessionInfo {
    private counter: number;
    private publicKey: Buffer;
    private sharedKey: Buffer;
    private epoch: Buffer;
    private clockTime: number;

    private createdAt: number;

    private sessionInfoBytes: Buffer;

    constructor(sessionInfoBytes: Buffer, privateKey: PrivateKey) {
        this.sessionInfoBytes = sessionInfoBytes;
        const sessionInfo = SessionInfoProtobuf.decode(sessionInfoBytes);

        this.publicKey = Buffer.from(sessionInfo.publicKey);
        this.sharedKey = Crypto.getSharedSecret(
            privateKey,
            PublicKey.fromUncompressedHexString(this.publicKey.toString('hex')),
        );
        this.epoch = Buffer.from(sessionInfo.epoch);
        this.counter = sessionInfo.counter;
        this.clockTime = sessionInfo.clockTime;
        this.createdAt = Math.floor(new Date().getTime() / 1000);
    }

    getCounter(): number {
        return this.counter;
    }

    getPublicKey(): Buffer {
        return this.publicKey;
    }

    getSharedKey(): Buffer {
        return this.sharedKey;
    }

    getEpoch(): Buffer {
        const hexEpoch = this.epoch.toString('hex');
        return Buffer.from(hexEpoch, 'hex');
    }

    getClockTime(): number {
        return this.clockTime;
    }

    incrementCounter() {
        this.counter += 1;
    }

    getSessionInfoBytes(): Buffer {
        const hexInfo = this.sessionInfoBytes.toString('hex');
        return Buffer.from(hexInfo, 'hex');
    }

    getVehicleSeconds(): number {
        const secondsElapsed =
            Math.floor(new Date().getTime() / 1000) - this.createdAt;
        return this.clockTime + secondsElapsed;
    }
}

export default SessionInfo;
