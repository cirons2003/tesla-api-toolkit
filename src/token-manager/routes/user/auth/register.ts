import { NextFunction, Request, Response, Router } from 'express';
import { hashPassword } from './utils/encryption';
import {
    DatabaseError,
    HttpError,
    ValidationError,
} from '../../../../middleware/errorHandler';
import { knexObj } from '../../../../database/knexObj';
import { User } from '../../../../database/schema/User';

const register = Router();

register.post(
    '/register',
    async (req: Request, res: Response, next: NextFunction) => {
        const { email, password } = req.body;

        if (!email || !password) {
            return next(
                new ValidationError(
                    undefined,
                    'email and username are required',
                ),
            );
        }

        try {
            const existingUser = await knexObj('users')
                .where('email', email)
                .first();
            if (existingUser) {
                return next(
                    new HttpError(
                        undefined,
                        'User with this email already exists',
                        400,
                    ),
                );
            }
        } catch (err) {
            return next(
                new DatabaseError(err, `Failed to query users table: ${err}`),
            );
        }

        try {
            const hashedPassword = await hashPassword(password);

            const newUser: User = {
                email,
                password: hashedPassword,
                valid_refresh_token: false,
            };

            const user_ids = await knexObj('users')
                .insert(newUser)
                .returning('id');
            const uid = user_ids[0].id;
            return res.status(200).json({
                message: `successfully registered user with email:${email}`,
                user_id: uid,
                success: true,
            });
        } catch (err) {
            return next(
                new DatabaseError(err, `Failed to insert new user: ${err}`),
            );
        }
    },
);

export default register;
