export function calculateScore(
    results
) {

    const passed =
        results.filter(
            x =>
                x.status ===
                "PASS"
        ).length;

    const failed =
        results.filter(
            x =>
                x.status ===
                "FAIL"
        ).length;

    const na =
        results.filter(
            x =>
                x.status ===
                "NA"
        ).length;

    const applicable =
        passed +
        failed;

    const score =
        applicable === 0
            ? 0
            : Math.round(
                (
                    passed /
                    applicable
                ) * 100
            );

    return {

        passed,

        failed,

        na,

        score
    };
}