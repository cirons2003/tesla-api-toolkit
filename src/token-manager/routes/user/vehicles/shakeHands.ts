import { NextFunction, Request, Response, Router } from 'express';
import { knexObj } from '../../../../database/knexObj';
import {
    Httpify,
    VehicleNotFoundError,
} from '../../../../middleware/errorHandler';
import { Vehicle } from '../../../../database/schema/Vehicle';
import { HTTPClient, RequestConfig } from '../../../HTTPClient/HTTPClient';

const shakeHands = Router();

shakeHands.get(
    '/shakeHands/',
    async (req: Request, res: Response, next: NextFunction) => {
        const vin = '7SAYGDEE1PF800170';

        try {
            const vehicle = HTTPClient.tesla.useVehicle(vin);
            console.log('SHAKING HANDS...');
            const res = await vehicle.startSession();
        } catch (err) {
            next(Httpify(err));
        }
    },
);

export default shakeHands;
