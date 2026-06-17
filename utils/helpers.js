export function replaceTokens(url, values) {

    let result = url;

    Object.entries(values).forEach(([key, value]) => {

        result =
            result.replace(`{${key}}`, value);

    });

    return result;
}

export function formatDate(value) {

    if (!value) return "";

    return new Date(value)
        .toLocaleString();
}

export function safeArray(value) {

    return Array.isArray(value)
        ? value
        : [];
}

export function sleep(ms) {

    return new Promise(resolve =>
        setTimeout(resolve, ms)
    );
}

export function generateId() {

    return crypto.randomUUID();
}

export function chunkArray(array, size) {

    const chunks = [];

    for (let i = 0; i < array.length; i += size) {

        chunks.push(
            array.slice(i, i + size)
        );
    }

    return chunks;
}