import { NextFunction, Request, Response, Router } from 'express';
import {
    AuthorizationError,
    DatabaseError,
    ValidationError,
} from '../../../../middleware/errorHandler';
import { getUserVehicles } from './queries/getUserVehicles';
import { knexObj } from '../../../../database/knexObj';

const addVehicle = Router();

addVehicle.post(
    '/addVehicle/:user_id',
    async (req: Request, res: Response, next: NextFunction) => {
        const { vin } = req.body;
        const { user_id } = req.params;

        if (!user_id) {
            return next(new ValidationError(undefined, 'user_id is required '));
        }

        if (!vin) {
            return next(new ValidationError(undefined, 'vin is required'));
        }

        const response = await getUserVehicles(+user_id);
        const vehicles = response.data.response;
        const userOwnsVehicle = vehicles.some(
            (vehicle) => vehicle?.vin === vin,
        );
        if (!userOwnsVehicle) {
            return next(
                new AuthorizationError(
                    `User does not have access to a vehicle with VIN ${vin}`,
                ),
            );
        }
        try {
            await knexObj('vehicles').insert({
                vin,
                user_id,
                key_paired: false,
            });
            res.status(200).json({
                message: `Successfully added vehicle with vin ${vin} to user ${user_id}. Make sure to pair our public key!`,
            });
        } catch (err) {
            next(new DatabaseError(err, 'Failed to add vehicle to database'));
        }
    },
);

export default addVehicle;
