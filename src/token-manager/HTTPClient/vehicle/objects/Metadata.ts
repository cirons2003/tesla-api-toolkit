import { Tag } from '../protobuf/outputs/signatures';

export class MetadataError extends Error {
    constructor(message: string) {
        super(`Metadata Error: ${message}`);
    }
}

class Metadata {
    private bufferQueue: Buffer[];
    private lastTag: number;

    constructor() {
        this.bufferQueue = [];
        this.lastTag = -1;
    }

    addUInt32(tag: Tag, value: number) {
        if (tag < 0 || tag > 255) {
            throw new MetadataError('AddUInt32 called with invalid Tag');
        }

        if (tag <= this.lastTag) {
            throw new MetadataError('Tags not in order');
        }

        if (!Number.isInteger(value)) {
            throw new MetadataError('AddUInt32 called with non-int value');
        }

        if (value < 0) {
            throw new MetadataError(
                'AddUInt32 called with signed integer (only unsigned integers are allowed)',
            );
        }

        const view = new DataView(new ArrayBuffer(6));
        view.setUint8(0, tag);
        view.setUint8(1, 0x04);
        view.setUint32(2, value, false); // big endian

        this.bufferQueue.push(Buffer.from(view.buffer));
        this.lastTag = tag;
    }

    addUInt8(tag: Tag, value: number) {
        if (tag < 0 || tag > 255) {
            throw new MetadataError('AddUInt8 called with invalid Tag');
        }

        if (tag <= this.lastTag) {
            throw new MetadataError('Tags not in order');
        }

        if (!Number.isInteger(value)) {
            throw new MetadataError('AddUInt8 called with non-int value');
        }

        if (value > 255) {
            throw new MetadataError(
                'addUInt8 called with value larger than 255',
            );
        }

        if (value < 0) {
            throw new MetadataError(
                'AddUInt8 called with signed integer (only unsigned integers are allowed)',
            );
        }

        const bytes = Buffer.alloc(3);
        bytes[0] = tag;
        bytes[1] = 0x01;
        bytes[2] = value;

        this.bufferQueue.push(bytes);
        this.lastTag = tag;
    }

    addString(tag: Tag, value: string) {
        if (tag < 0 || tag > 255) {
            throw new MetadataError('AddString called with invalid Tag');
        }

        if (tag <= this.lastTag) {
            throw new MetadataError('Tags not in order');
        }

        const valueLength = value.length;

        const bytes = new Uint8Array(2 + valueLength);
        bytes[0] = tag;
        bytes[1] = valueLength;
        for (let i = 0; i < valueLength; i++) {
            const charCode = value.charCodeAt(i);
            if (charCode < 0 || charCode > 255) {
                throw new MetadataError(
                    'Invalid character in value during addString',
                );
            }
            bytes[i + 2] = charCode;
        }

        this.bufferQueue.push(Buffer.from(bytes));
        this.lastTag = tag;
    }

    addHexString(tag: Tag, value: string) {
        if (tag < 0 || tag > 255) {
            throw new MetadataError('addHexString called with invalid Tag');
        }

        if (tag <= this.lastTag) {
            throw new MetadataError('Tags not in order');
        }

        if (value.length % 2 !== 0) {
            throw new MetadataError('addHexString value must be in hex');
        }

        const valueLength = value.length / 2;

        const bytes = new Uint8Array(2 + valueLength);
        bytes[0] = tag;
        bytes[1] = valueLength;
        for (let i = 0; i < valueLength; i++) {
            const currByte = value.substring(2 * i, 2 * i + 2);
            bytes[i + 2] = parseInt(currByte, 16);
        }

        this.bufferQueue.push(Buffer.from(bytes));
        this.lastTag = tag;
    }

    toHex(): string {
        const finalBuffer = Buffer.concat([
            ...this.bufferQueue,
            Buffer.from([Tag.TAG_END]),
        ]);
        return finalBuffer.toString('hex');
    }

    toBytes(): Buffer {
        return Buffer.concat([...this.bufferQueue, Buffer.from('FF', 'hex')]);
    }
}

export default Metadata;
