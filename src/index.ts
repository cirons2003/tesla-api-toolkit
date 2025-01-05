import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import extractToken from './token-manager/routes/extractToken/extractToken';
import userRouter from './token-manager/routes/user';
import { errorHandler } from './middleware/errorHandler';

// load .env file
dotenv.config();

// configure redis
/*const redis = require('redis');
export const redisClient = redis.createClient({
    url: process.env.REDIS_URL,
});
redisClient.on('error', (err: any) => console.error('Redis Client Error', err));

// establish redis connection
const initializeRedisConnection = async () => {
    await redisClient.connect();
};
initializeRedisConnection();
*/
// initialize app and set up middleware
const app = express();
app.use(cors());
app.use(express.json());

// host public key
app.use(express.static(path.join(__dirname, '../public')));

// include middleware

// include routers
app.use(extractToken);
app.use('/user', userRouter);

// error handling
app.use(errorHandler);

// run server
const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
