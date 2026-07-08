export function loadAnswerList(
    data
) {

    if (
        Array.isArray(
            data
        )
    ) {

        return data;
    }

    if (
        data &&
        Array.isArray(
            data.answers
        )
    ) {

        return data.answers;
    }

    return [];
}

export function getAnswerTimestampMillis(
    answer
) {

    const candidates = [
        answer?.updatedOn,
        answer?.createdOn
    ];

    for (const value of candidates) {
        const timestamp =
            Date.parse(
                String(
                    value || ""
                )
            );

        if (
            !Number.isNaN(
                timestamp
            )
        ) {

            return timestamp;
        }
    }

    return 0;
}

export function compareAnswersByRecency(
    left,
    right
) {

    const leftTimestamp =
        getAnswerTimestampMillis(
            left
        );

    const rightTimestamp =
        getAnswerTimestampMillis(
            right
        );

    if (
        leftTimestamp !== rightTimestamp
    ) {

        return rightTimestamp - leftTimestamp;
    }

    const leftId =
        Number(
            left?.assessmentSurveyAnswerId || 0
        );

    const rightId =
        Number(
            right?.assessmentSurveyAnswerId || 0
        );

    if (
        leftId !== rightId
    ) {

        return rightId - leftId;
    }

    return Number(
        right?.surveyTemplateQuestionId || 0
    ) -
        Number(
            left?.surveyTemplateQuestionId || 0
        );
}

export function normalizeAnswersByAlternateQuestionId(
    data
) {

    const selected =
        new Map();

    for (const answer of loadAnswerList(data)) {
        const alternateQuestionId =
            answer?.alternateQuestionId;

        if (
            !alternateQuestionId
        ) {
            continue;
        }

        const current =
            selected.get(
                alternateQuestionId
            );

        if (
            !current ||
            compareAnswersByRecency(
                answer,
                current
            ) < 0
        ) {

            selected.set(
                alternateQuestionId,
                answer
            );
        }
    }

    return [
        ...selected.values()
    ];
}
