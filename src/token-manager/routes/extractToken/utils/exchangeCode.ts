import axios from 'axios';
import { TeslaError } from '../../../../middleware/errorHandler';

// throws Http Errors
const exchangeCode = async (code: string) => {
    const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.CLIENT_ID ?? 'No-Client-Id',
        client_secret: process.env.CLIENT_SECRET ?? 'No-Client-Secret',
        code: code,
        audience: 'https://fleet-api.prd.na.vn.cloud.tesla.com',
        redirect_uri: `${process.env.BASE_URL}/extractToken`,
        scope: 'openid offline_access vehicle_device_data vehicle_cmds vehicle_charging_cmds',
    });

    try {
        const response = await axios.post(
            'https://auth.tesla.com/oauth2/v3/token',
            params.toString(),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            },
        );
        const { access_token, refresh_token, id_token } = response.data;
        return { access_token, refresh_token, id_token };
    } catch (err) {
        throw new TeslaError(err, `Failed to exchange code: ${err}`);
    }
};

export default exchangeCode;
