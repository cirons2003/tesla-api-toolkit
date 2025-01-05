import { redisClient } from '../..';

export const addVehicle = async (userId: string) => {
    const userVehicles = (await redisClient.get(`vehicles_${userId}`)) ?? [];

    const vehicleId = userId + userVehicles.length;
    userVehicles.append();
};
