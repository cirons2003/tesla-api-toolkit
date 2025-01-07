import {
    SignatureType,
    Tag,
} from '../../VehicleCache/Vehicle/protobuf/outputs/signatures';
import Metadata from '../../VehicleCache/Vehicle/objects/Metadata';

describe('Metadata', () => {
    it('Should properly encode ints', () => {
        const metadata = new Metadata();
        metadata.addUInt32(Tag.TAG_COUNTER, 100);
        expect('0x' + metadata.toHex()).toBe('0x050400000064' + 'ff');
    });

    it('Should properly encode strings', () => {
        const metadata = new Metadata();
        metadata.addString(Tag.TAG_PERSONALIZATION, 'abc');
        expect('0x' + metadata.toHex()).toBe('0x0203616263' + 'ff');
    });

    it('Should properly encode hexStrings', () => {
        const metadata = new Metadata();
        metadata.addHexString(
            Tag.TAG_CHALLENGE,
            '1588d5a30eabc6f8fc9a951b11f6fd11',
        );
        expect(metadata.toHex()).toBe(
            '06101588d5a30eabc6f8fc9a951b11f6fd11' + 'ff',
        );
    });

    it('Should properly serialize', () => {
        const metadata = new Metadata();
        metadata.addString(Tag.TAG_PERSONALIZATION, 'abc');
        metadata.addUInt32(Tag.TAG_COUNTER, 100);
        expect('0x' + metadata.toHex()).toBe('0x0203616263050400000064ff');

        const metadata2 = new Metadata();
        metadata2.addUInt8(
            Tag.TAG_SIGNATURE_TYPE,
            SignatureType.SIGNATURE_TYPE_HMAC,
        );
        metadata2.addString(Tag.TAG_PERSONALIZATION, '5YJ30123456789ABC');
        metadata2.addHexString(
            Tag.TAG_CHALLENGE,
            '1588d5a30eabc6f8fc9a951b11f6fd11',
        );
        expect(metadata2.toHex()).toBe(
            '000106021135594a333031323334353637383941424306101588d5a30eabc6f8fc9a951b11f6fd11ff',
        );
    });
});
