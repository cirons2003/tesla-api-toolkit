import { decode } from 'jsonwebtoken';
import { knexObj } from '../../../../database/knexObj';
import { DatabaseError } from '../../../../middleware/errorHandler';

type Tokens = {
    access_token: string;
    refresh_token: string;
    id_token: string;
};

// throws Http Errors
const initiateUserSession = async (uid: number, tokens: Tokens) => {
    const { access_token, refresh_token } = tokens;

    try {
        await knexObj('users').where('id', uid).update({
            tesla_access_token: access_token,
            tesla_refresh_token: refresh_token,
            valid_refresh_token: true,
        });
        console.log(`User ${uid} successfully granted Tesla Access`);
    } catch (err) {
        throw new DatabaseError(err, `Failed to assign user tokens: ${err}`);
    }

    /* schedule refresh */
};

export default initiateUserSession;
