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
                                item.assetName
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
                        item.assetName
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
                item =>
                    new Date(
                        item.surveyCompletedOn
                    ) >=
                    new Date(
                        filters.fromDate
                    )
            );
    }

    if (
        filters.toDate
    ) {

        results =
            results.filter(
                item =>
                    new Date(
                        item.surveyCompletedOn
                    ) <=
                    new Date(
                        filters.toDate
                    )
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
