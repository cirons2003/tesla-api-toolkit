export const parseState = (state: string) => {
    const bindings = state.split('&');
    return bindings.reduce(
        (acc: { [key: string]: string }, binding: string) => {
            const [key, val] = binding.split('=');
            acc[key] = val;
            return acc;
        },
        {},
    );
};
