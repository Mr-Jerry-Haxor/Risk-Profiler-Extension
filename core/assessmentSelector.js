export function filterAssessments(
    assessments,
    filters
) {

    let results =
        [...assessments];

    if (
        filters.search &&
        filters.search.trim()
    ) {

        if (
            filters.regexMode
        ) {

            try {

                const regex =
                    new RegExp(
                        filters.search,
                        "i"
                    );

                results =
                    results.filter(
                        item =>
                            regex.test(
                                item.assetName || ""
                            )
                    );

            } catch {

                return [];
            }

        } else {

            const text =
                filters.search
                    .toLowerCase();

            results =
                results.filter(
                    item =>
                        (item.assetName || "")
                            .toLowerCase()
                            .includes(text)
                );
        }
    }

    if (
        filters.fromDate
    ) {

        results =
            results.filter(
                item => {

                    const dateKey =
                        getAssessmentDateKey(item);

                    return !!dateKey &&
                        dateKey >= filters.fromDate;
                }
            );
    }

    if (
        filters.toDate
    ) {

        results =
            results.filter(
                item => {

                    const dateKey =
                        getAssessmentDateKey(item);

                    return !!dateKey &&
                        dateKey <= filters.toDate;
                }
            );
    }

    if (
        filters.assessmentStatus
    ) {

        results =
            results.filter(
                item => {

                    const isIncomplete =
                        !!item.incompleteAssessmentId ||
                        !!item.hasIncomplete;

                    return filters.assessmentStatus ===
                        "incomplete"
                        ? isIncomplete
                        : !isIncomplete;
                }
            );
    }

    return results;
}

function getAssessmentDateKey(item) {

    const value =
        item.surveyCompletedOn ||
        item.attestOn ||
        item.incompleteInitiatedOn ||
        item.raw?.surveyCompletedOn ||
        item.raw?.attestOn ||
        item.raw?.incompleteInitiatedOn;

    if (
        !value
    ) {
        return "";
    }

    const text =
        String(value);

    const isoDate =
        text.match(
            /^\d{4}-\d{2}-\d{2}/
        );

    if (
        isoDate
    ) {
        return isoDate[0];
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "";
    }

    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("-");
}

export function toggleSelection(
    selected,
    assessmentId
) {

    const copy =
        [...selected];

    const index =
        copy.indexOf(
            assessmentId
        );

    if (
        index >= 0
    ) {

        copy.splice(
            index,
            1
        );

    } else {

        copy.push(
            assessmentId
        );
    }

    return copy;
}

export function selectAll(
    assessments
) {

    return assessments.map(
        x =>
            x.assessmentId
    );
}
