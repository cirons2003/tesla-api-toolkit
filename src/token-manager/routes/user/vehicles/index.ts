import { Router } from 'express';
import getVehicles from './getVehicles';
import honkHorn from './honkHorn';
import shakeHands from './shakeHands';

const userVehicles = Router();

userVehicles.use(getVehicles);
userVehicles.use(honkHorn);
userVehicles.use(shakeHands);

export default userVehicles;
