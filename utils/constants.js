export const CONFIG = {

    VERSION: "1.0.0",

    MAX_CONCURRENT_VALIDATIONS: 5,

    STORAGE_KEYS: {

        SETTINGS: "settings",

        ASSESSMENTS: "assessments",

        SELECTED_ASSESSMENTS: "selectedAssessments",

        CONTEXTS: "contexts",

        VALIDATIONS: "validations",

        LAST_RUN: "lastRun",

        DEBUG: "debug"
    }
};

export const URLS = {

    PRIMARY_ASSESSMENTS:
        "https://cairois.web.boeing.com/api/asset/4/82/assessment/type/35",

    ASSESSMENT_DETAIL:
        "https://cairois.web.boeing.com/api/assessment/{id}/detail",

    ASSESSMENT_ANSWERS:
        "https://cairois.web.boeing.com/api/assessment/survey/{id}/answers",

    REVIEW_SUMMARY:
        "https://cairois.web.boeing.com/api/asset/4/{assetId}/assessment/review/summaries?assessmentTypeId=35&reviewTypeId=6",

    ESATS_VERSIONS:
        "https://service-gateway.tas-phx.apps.boeing.com/gateway/asset/BusinessApplicationVersion/GetBusinessApplicationVersions?esatsId={assetId}",

    ESATS_ARTIFACTS:
        "https://service-gateway.tas-phx.apps.boeing.com/gateway/asset/BusinessApplicationVersionDocument/GetBusinessApplicationVersionPolicyAndArtifacts?esatsId={versionEsatsId}",

    GTC_LOOKUP:
        "https://termbank.web.boeing.com/ses/v1.2/GlobalTradeControlVocabularies/name/{name}.json"
};

export const PREREQUISITE_CHECKS = [

    {
        id: "cairo",
        name: "Cairo",
        url:
            URLS.PRIMARY_ASSESSMENTS,
        expectedHosts: [
            "cairois.web.boeing.com"
        ]
    },

    {
        id: "esats",
        name: "ESATS",
        url:
            "https://service-gateway.tas-phx.apps.boeing.com/",
        expectedHosts: [
            "service-gateway.tas-phx.apps.boeing.com",
            "esats.web.boeing.com"
        ]
    },

    {
        id: "gtc",
        name: "GTC",
        url:
            "https://termbank.web.boeing.com/",
        expectedHosts: [
            "termbank.web.boeing.com",
            "gtc-ecm.web.boeing.com"
        ]
    }
];
