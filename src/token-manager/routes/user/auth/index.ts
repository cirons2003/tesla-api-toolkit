import { Router } from 'express';
import register from './register';
import login from './login';

const userAuth = Router();
userAuth.use(register);
userAuth.use(login);

export default userAuth;
