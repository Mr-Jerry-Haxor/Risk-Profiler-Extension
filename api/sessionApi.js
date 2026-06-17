import {
    fetchJson
}
from "./requestManager.js";

const CHECKS = [

    "https://cairois.web.boeing.com",

    "https://esats.web.boeing.com",

    "https://gtc-ecm.web.boeing.com"
];

export async function validateSessions() {

    const results =
        await Promise.allSettled(

            CHECKS.map(
                url =>
                    fetch(url, {
                        credentials:
                            "include"
                    })
            )
        );

    return results.map(
        (
            result,
            index
        ) => ({

            url: CHECKS[index],

            success:
                result.status ===
                "fulfilled"
        })
    );
}