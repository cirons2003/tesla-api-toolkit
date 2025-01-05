import { SignatureType } from '../../protobuf/outputs/signatures';

import VehicleCommand from '../VehicleCommand';
import { mockedVehicle, testPemPublicKeyClient } from './testValues';

import { clientPublicKey } from '../../keys';
import PublicKey from '../PublicKey';
import {
    Domain,
    RoutableMessage,
} from '../../protobuf/outputs/universal_message';

describe('VehicleCommand', () => {
    it('Should Properly generate bytes for AESGCM encrypted command', () => {
        const commandBytes = Buffer.from('120452020801', 'hex');

        const vehicleCommand = new VehicleCommand(
            commandBytes,
            mockedVehicle,
            SignatureType.SIGNATURE_TYPE_AES_GCM_PERSONALIZED,
            Domain.DOMAIN_INFOTAINMENT,
            5,
        );
        const payloadBytes = vehicleCommand.toBytes();

        const expectedRoutableMessage: RoutableMessage = {
            toDestination: {
                domain: Domain.DOMAIN_INFOTAINMENT,
            },
            fromDestination: {
                routingAddress: vehicleCommand.getRoutingAddress(),
            },
            protobufMessageAsBytes: vehicleCommand.getCipherText(),
            signatureData: {
                signerIdentity: {
                    publicKey: clientPublicKey.toBuffer(),
                },
                AESGCMPersonalizedData: {
                    epoch: Buffer.from(
                        '4c463f9cc0d3d26906e982ed224adde6',
                        'hex',
                    ),
                    nonce: vehicleCommand.getNonce() as Buffer,
                    counter: vehicleCommand.getCounter(),
                    expiresAt: 2655,
                    tag: vehicleCommand.getAuthTag(),
                },
            },
            uuid: vehicleCommand.getUUID(),
        };
        const expectedPayloadBytes = Buffer.from(
            RoutableMessage.encode(expectedRoutableMessage).finish(),
        );

        expect(payloadBytes.toString('hex')).toBe(
            expectedPayloadBytes.toString('hex'),
        );
    });
});
