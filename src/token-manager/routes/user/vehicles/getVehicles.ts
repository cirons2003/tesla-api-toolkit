import { NextFunction, Request, response, Response, Router } from 'express';
import {
    HttpError,
    Httpify,
    ValidationError,
} from '../../../../middleware/errorHandler';
import { checkUser } from '../../../../database/utils/checkUser';
import { getUserVehicles } from './queries/getUserVehicles';

const getVehicles = Router();

getVehicles.get(
    '/getVehicles/:user_id',
    async (req: Request, res: Response, next: NextFunction) => {
        const { user_id } = req.params;

        if (!user_id) {
            return next(new ValidationError(undefined, 'user_id is required'));
        }

        try {
            const userExists = await checkUser(+user_id);
            if (!userExists) {
                throw new HttpError(
                    undefined,
                    `User with id ${user_id} not found`,
                    404,
                );
            }
            const vehiclesResponse = await getUserVehicles(+user_id);

            res.status(200).send({
                data: vehiclesResponse?.data,
                success: true,
            });
        } catch (err) {
            next(Httpify(err));
        }
    },
);

export default getVehicles;
