import { schedule, ScheduledTask } from 'node-cron';
import { refreshToken } from './refreshToken';

type TokenRefreshJobs = {
    [userId: string]: ScheduledTask;
};

export const tokenRefreshJobs: TokenRefreshJobs = {};

export const scheduleRefresh = (userId: string) => {
    const refreshJob = schedule(
        `0 */${process.env.TOKEN_REFRESH_GAP} * * *`,
        () => {
            refreshToken(userId);
        },
    );

    tokenRefreshJobs[userId] = refreshJob;
};

export const cancelRefreshJob = (userId: string) => {
    tokenRefreshJobs[userId].stop();
    delete tokenRefreshJobs[userId];
};
