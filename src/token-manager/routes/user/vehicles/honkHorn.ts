import { NextFunction, Request, Response, Router } from 'express';
import { knexObj } from '../../../../database/knexObj';
import {
    Httpify,
    VehicleNotFoundError,
} from '../../../../middleware/errorHandler';
import { Vehicle } from '../../../../database/schema/Vehicle';
import { HTTPClient, RequestConfig } from '../../../HTTPClient/HTTPClient';

const honkHorn = Router();

honkHorn.get(
    '/honkHorn/',
    async (req: Request, res: Response, next: NextFunction) => {
        /*const { vehicle_id } = req.params;

        const vehicle = await knexObj<Vehicle>('vehicles')
            .where('id', vehicle_id)
            .first();

        if (!vehicle) {
            return next(new VehicleNotFoundError(undefined, +vehicle_id));
        }
*/
        const vin = '7SAYGDEE1PF800170';

        try {
            const vehicle = HTTPClient.tesla.useVehicle(vin);
            if (vehicle == undefined) {
                console.log('Couldnt connect vehicle');
                return;
            }
            console.log(vehicle.honkHorn());
        } catch (err) {
            next(Httpify(err));
        }
    },
);

export default honkHorn;
