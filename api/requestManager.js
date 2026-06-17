const memoryCache = new Map();

const DEFAULT_OPTIONS = {
    retries: 3,
    retryDelay: 1000,
    useCache: true
};

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchJson(
    url,
    options = {}
) {

    const config = {
        ...DEFAULT_OPTIONS,
        ...options
    };

    if (
        config.useCache &&
        memoryCache.has(url)
    ) {
        return memoryCache.get(url);
    }

    let lastError;

    for (
        let attempt = 1;
        attempt <= config.retries;
        attempt++
    ) {

        try {

            const response =
                await fetch(url, {
                    credentials: "include"
                });

            if (!response.ok) {

                throw new Error(
                    `${response.status} ${response.statusText}`
                );
            }

            const data =
                await response.json();

            if (config.useCache) {

                memoryCache.set(
                    url,
                    data
                );
            }

            return data;

        } catch (error) {

            lastError = error;

            if (
                attempt <
                config.retries
            ) {

                await sleep(
                    config.retryDelay
                );
            }
        }
    }

    throw lastError;
}

export function clearCache() {

    memoryCache.clear();
}