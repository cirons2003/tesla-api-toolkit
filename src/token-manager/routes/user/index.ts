import { Router } from 'express';
import userAuth from './auth';
import userVehicles from './vehicles';

const userRouter = Router();
userRouter.use('/auth', userAuth);
userRouter.use('/vehicles', userVehicles);

export default userRouter;
