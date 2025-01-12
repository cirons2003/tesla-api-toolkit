import {
    MessageFaultE,
    MessageStatus,
    RoutableMessage,
} from '../../VehicleCache/Vehicle/protobuf/outputs/universal_message';
import {
    asyncErrorHandler,
    exponentialBackoff,
} from '../../VehicleCache/Vehicle/VehicleError/utils';

describe('Vehicle Error Handling Utilities', () => {
    it('Should implement exponential backoff', () => {
        const inputs = [1, 2, 3, 4];
        const outputs = [1000, 2000, 4000, 8000];

        for (let i = 0; i < inputs.length; i++) {
            expect(exponentialBackoff(inputs[i], 1000)).toBe(outputs[i]);
        }
    });
});

describe('asyncErrorHandler', () => {
    it('Should retry correctly for protocol errors', async () => {
        const trials = [
            {
                // Successful first try
                maxRetries: 10,
                statusProgression: [0] as MessageFaultE[],
                expectedCalls: 1,
                expectingError: false,
            },
            {
                // Successful after 5 retries
                maxRetries: 10,
                statusProgression: [1, 2, 2, 11, 19, 0] as MessageFaultE[],
                expectedCalls: 6,
                expectingError: false,
            },
            {
                // Fails after running out of retries
                maxRetries: 2,
                statusProgression: [1, 2, 11, 19, 0] as MessageFaultE[],
                expectedCalls: 3,
                expectingError: true,
            },
            {
                // Fails after running out of retries
                maxRetries: 0,
                statusProgression: [1, 2, 11, 19, 0] as MessageFaultE[],
                expectedCalls: 1,
                expectingError: true,
            },
            {
                // Fails due to irrecoverable error (21)
                maxRetries: 10,
                statusProgression: [1, 2, 21, 19, 0] as MessageFaultE[],
                expectedCalls: 3,
                expectingError: true,
            },
        ];

        // Run trials
        for (let i = 0; i < trials.length; i++) {
            const thisTrial = trials[i];
            const statusProgression = thisTrial.statusProgression;
            const maxRetries = thisTrial.maxRetries;

            // Generates a mocked routable message with a certain statusCode
            const generateTestRoutableMessage = (index: number) => {
                return {
                    signedMessageStatus: {
                        signedMessageFault: statusProgression[
                            index
                        ] as MessageFaultE,
                    } as unknown as MessageStatus,
                } as RoutableMessage;
            };

            let index = 0;

            // Simulates different protocol errors...
            const callback = jest.fn(() => {
                return new Promise((res) =>
                    setTimeout(() => {
                        res(generateTestRoutableMessage(index++));
                    }, 0),
                );
            }) as () => Promise<RoutableMessage>;

            const [res, err] = await asyncErrorHandler(callback, maxRetries, 1);

            // check if error status is as expected
            if (thisTrial.expectingError) {
                expect(res).toBe(null);
            } else {
                expect(err).toBe(null);
            }

            // check if number of retries is correct
            expect(callback).toHaveBeenCalledTimes(thisTrial.expectedCalls);
        }
    });
});
