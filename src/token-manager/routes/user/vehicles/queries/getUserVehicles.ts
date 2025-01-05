import { HTTPClient } from '../../../../HTTPClient/HTTPClient';

type TeslaListVehiclesResponse = {
    response: {
        vin: string;
        [key: string]: any;
    }[];
    pagination: { [key: string]: any };
};

// throws http errors
export const getUserVehicles = async (user_id: number) => {
    return await HTTPClient.tesla.userRequest<TeslaListVehiclesResponse>(
        '/api/1/vehicles',
        user_id,
        {
            method: 'GET',
        },
    );
};
