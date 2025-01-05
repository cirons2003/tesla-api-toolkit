import { Action } from '../../protobuf/outputs/car_server';
import Vehicle from '../Vehicle';

describe('Vehicle', () => {
    it('Should properly encode vehicle actions', () => {
        const action: Action = {
            vehicleAction: {
                hvacAutoAction: {
                    powerOn: true,
                },
            },
        };

        expect(Vehicle.getVehicleCommandBytes(action).toString('hex')).toBe(
            '120452020801',
        );
    });
});
