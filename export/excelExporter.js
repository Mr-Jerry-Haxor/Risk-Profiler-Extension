
const TEMPLATE_PATH =
    chrome.runtime.getURL(
        "assets/encoded_data.txt"
    );

export async function exportResults(validationResults) {
    const results = Array.isArray(validationResults) ? validationResults : [];
    const workbook = await loadTemplateWorkbook();
    const templateSheet = workbook.worksheets[0];
    const allAssessmentsSheet = workbook.addWorksheet("All Assessments");

    const sheetLookup = new Map();

    for (let index = 0; index < results.length; index++) {
        const result = results[index];
        const assessment = getAssessment(result);
        const sheetName = createSheetName(assessment, index);

        sheetLookup.set(assessment.assessmentId, sheetName);

        const worksheet = cloneWorksheet(workbook, templateSheet, sheetName);
        populateAssessmentSheet(worksheet, result, assessment);
    }

    buildSummarySheet(allAssessmentsSheet, results, sheetLookup);

    workbook.removeWorksheet(templateSheet.id);

    // Ensure Excel recalculates formulas (Totals, Percentages, etc.)
    workbook.calcProperties.fullCalcOnLoad = true;
    workbook.calcProperties.calcMode = "auto";

    const buffer = await workbook.xlsx.writeBuffer();
    downloadFile(buffer, `Risk_Profiler_Quality_List_${timestamp()}.xlsx`);
}

/*
====================================================
LOAD TEMPLATE
====================================================
*/

async function loadTemplateWorkbook() {

    const response =
        await fetch(
            TEMPLATE_PATH
        );

    const base64 =
        (
            await response.text()
        )
            .trim();

    const binary =
        Uint8Array.from(
            atob(base64),
            c =>
                c.charCodeAt(0)
        );

    const workbook =
        new ExcelJS.Workbook();

    await workbook.xlsx.load(
        binary.buffer
    );

    return workbook;
}

/*
====================================================
SUMMARY SHEET
====================================================
*/

function buildSummarySheet(worksheet, results, sheetLookup) {
    worksheet.columns = [
        { header: "Open", key: "open", width: 15 },
        { header: "Assessment ID", key: "assessmentId", width: 18 },
        { header: "Application", key: "application", width: 40 },
        { header: "Asset ID", key: "assetId", width: 15 },
        { header: "Lifecycle", key: "lifecycle", width: 20 },
        { header: "Application Manager", key: "manager", width: 30 },
        { header: "Business System Owner", key: "owner", width: 30 },
        { header: "Survey Completed Date", key: "surveyCompletedDate", width: 22 },
        { header: "Attested Date", key: "attestedDate", width: 22 },
        { header: "Status", key: "status", width: 15 },
        { header: "Attested By", key: "attestedBy", width: 30 },
        { header: "Passed", key: "passed", width: 12 },
        { header: "Failed", key: "failed", width: 12 },
        { header: "N/A", key: "na", width: 12 },
        { header: "Score", key: "score", width: 12 },
        { header: "Error", key: "error", width: 60 }
    ];

    results.forEach(result => {
        const assessment = getAssessment(result);
        const summary = result.summary || {};

        const failedRules =
            (result.results || [])
                .filter(r => r.status === "FAIL")
                .map(r => `${r.id}: ${r.reason}`);

        const missingRules =
            (result.results || [])
                .filter(r =>
                    r.reason ===
                    "Question identifier was not found in the survey questions."
                )
                .map(r => r.id);

        const errorText = [
            result.error,
            missingRules.length
                ? `Missing Questions: ${missingRules.join(", ")}`
                : "",
            failedRules.length
                ? failedRules.join(" | ")
                : ""
        ]
        .filter(Boolean)
        .join(" | ");

        const row = worksheet.addRow({
            open: "Open",
            assessmentId: assessment.assessmentId,
            application: assessment.assetName,
            assetId: assessment.assetId,
            lifecycle: assessment.lifeCycle,
            manager: assessment.appMgrName,
            owner: assessment.sysOwnerName,
            surveyCompletedDate:
                formatDate(
                    assessment.surveyCompletedOn
                ),

            attestedDate:
                formatDate(
                    assessment.attestOn
                ),

            status:
                assessment.hasIncomplete
                    ? "Incomplete"
                    : "Completed",

            attestedBy:
                assessment.attestName || "",
            passed: summary.passed || 0,
            failed: summary.failed || 0,
            na: summary.na || 0,
            score: summary.score ? `${summary.score}%` : "",
            error: errorText 
        });

        const sheetName = sheetLookup.get(assessment.assessmentId);
        const hyperlinkCell = row.getCell(1);
        hyperlinkCell.value = { text: "Open", hyperlink: `#'${sheetName}'!A1` };
        hyperlinkCell.font = { color: { argb: "FF0563C1" }, underline: true };
    });

    worksheet.getRow(1).font = { bold: true };
}


/*
====================================================
ASSESSMENT SHEETS
====================================================
*/

function populateAssessmentSheet(worksheet, result, assessment) {
    worksheet.getCell("C2").value = assessment.assetName || "";
    worksheet.getCell("C3").value = assessment.assetId || "";
    worksheet.getCell("C4").value = assessment.appMgrName || "";
    worksheet.getCell("C5").value = formatDate(new Date());

    const rpMap = discoverRpRows(worksheet);

    (result.results || []).forEach(rule => {
        const row = rpMap[String(rule.id).toUpperCase()];
        if (!row) return;

        const statusCell = worksheet.getCell(`A${row}`);
        statusCell.value = convertStatus(rule.status);

        const status = String(rule.status || "").toUpperCase();
        if (status === "PASS") {
            statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF00A300" } };
            statusCell.font = { color: { argb: "FF006100" }, bold: true };
        } else if (status === "FAIL") {
            statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF0000" } };
            statusCell.font = { color: { argb: "FF9C0006" }, bold: true };
        } else if (status === "NA") {
            statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
            statusCell.font = { color: { argb: "FF404040" }, italic: true };
        }
        worksheet.getCell(`D${row}`).value = rule.reason || "";
    });
}

function discoverRpRows(
    worksheet
) {

    const map = {};

    worksheet.eachRow(
        (
            row,
            rowNumber
        ) => {

            const value =
                String(
                    row.getCell(2)
                        .value || ""
                )
                    .trim()
                    .toUpperCase();

            if (
                /^RP\d+$/.test(
                    value
                )
            ) {

                map[value] =
                    rowNumber;
            }
        }
    );

    return map;
}

/*
====================================================
CLONE SHEET
====================================================
*/


function cloneWorksheet(
    workbook,
    source,
    name
) {

    const target =
        workbook.addWorksheet(
            name
        );

    /*
    ====================================
    WORKSHEET SETTINGS
    ====================================
    */

    if (
        source.properties
    ) {

        target.properties =
            JSON.parse(
                JSON.stringify(
                    source.properties
                )
            );
    }

    if (
        source.pageSetup
    ) {

        target.pageSetup =
            JSON.parse(
                JSON.stringify(
                    source.pageSetup
                )
            );
    }

    if (
        source.views
    ) {

        target.views =
            JSON.parse(
                JSON.stringify(
                    source.views
                )
            );
    }

    /*
    ====================================
    COLUMNS
    ====================================
    */

    source.columns.forEach(
        (
            column,
            index
        ) => {

            const targetColumn =
                target.getColumn(
                    index + 1
                );

            targetColumn.width =
                column.width;

            targetColumn.hidden =
                column.hidden;

            targetColumn.outlineLevel =
                column.outlineLevel;
        }
    );

    /*
    ====================================
    ROWS + CELLS
    ====================================
    */

    source.eachRow(
        {
            includeEmpty:
                true
        },
        (
            row,
            rowNumber
        ) => {

            const targetRow =
                target.getRow(
                    rowNumber
                );

            targetRow.height =
                row.height;

            targetRow.hidden =
                row.hidden;

            targetRow.outlineLevel =
                row.outlineLevel;

            row.eachCell(
                {
                    includeEmpty:
                        true
                },
                (
                    cell,
                    colNumber
                ) => {

                    const targetCell =
                        targetRow.getCell(
                            colNumber
                        );

                    /*
                    ====================================
                    VALUE
                    ====================================
                    */

                    if (
                        typeof cell.value === "object" &&
                        cell.value !== null
                    ) {

                        try {

                            targetCell.value =
                                JSON.parse(
                                    JSON.stringify(
                                        cell.value
                                    )
                                );

                        } catch {

                            targetCell.value =
                                cell.text || "";
                        }

                    } else {

                        targetCell.value =
                            cell.value;
                    }

                    /*
                    ====================================
                    STYLE
                    ====================================
                    */

                    try {

                        targetCell.style =
                            JSON.parse(
                                JSON.stringify(
                                    cell.style || {}
                                )
                            );

                    } catch {

                        targetCell.style = {};
                    }

                    /*
                    ====================================
                    ALIGNMENT
                    ====================================
                    */

                    if (
                        cell.alignment
                    ) {

                        try {

                            targetCell.alignment =
                                JSON.parse(
                                    JSON.stringify(
                                        cell.alignment
                                    )
                                );

                        } catch {}
                    }

                    /*
                    ====================================
                    FONT
                    ====================================
                    */

                    if (
                        cell.font
                    ) {

                        try {

                            targetCell.font =
                                JSON.parse(
                                    JSON.stringify(
                                        cell.font
                                    )
                                );

                        } catch {}
                    }

                    /*
                    ====================================
                    BORDER
                    ====================================
                    */

                    if (
                        cell.border
                    ) {

                        try {

                            targetCell.border =
                                JSON.parse(
                                    JSON.stringify(
                                        cell.border
                                    )
                                );

                        } catch {}
                    }

                    /*
                    ====================================
                    FILL
                    ====================================
                    */

                    if (
                        cell.fill
                    ) {

                        try {

                            targetCell.fill =
                                JSON.parse(
                                    JSON.stringify(
                                        cell.fill
                                    )
                                );

                        } catch {}
                    }

                    /*
                    ====================================
                    NUMBER FORMAT
                    ====================================
                    */

                    if (
                        cell.numFmt
                    ) {

                        targetCell.numFmt =
                            cell.numFmt;
                    }

                    /*
                    ====================================
                    PROTECTION
                    ====================================
                    */

                    if (
                        cell.protection
                    ) {

                        try {

                            targetCell.protection =
                                JSON.parse(
                                    JSON.stringify(
                                        cell.protection
                                    )
                                );

                        } catch {}
                    }
                }
            );
        }
    );

    /*
    ====================================
    MERGED CELLS
    ====================================
    */

    if (
        source.model?.merges
    ) {

        source.model.merges.forEach(
            merge => {

                try {

                    target.mergeCells(
                        merge
                    );

                } catch {}
            }
        );
    }

    return target;
}


/*
====================================================
HELPERS
====================================================
*/

function convertStatus(
    status
) {

    switch (
        String(
            status || ""
        ).toUpperCase()
    ) {

        case "PASS":
            return "Yes";

        case "FAIL":
            return "No";

        case "NA":
            return "N/A";

        default:
            return "";
    }
}

function getAssessment(
    result
) {

    return {

        ...(result.assessment || {}),

        assessmentId:
            result.assessmentId,

        assetName:
            result.assetName,

        ...(result.assessment || {})
    };
}

function createSheetName(
    assessment,
    index
) {

    const name =
        (
            assessment.assetName ||
            `Assessment ${index + 1}`
        )
            .replace(
                /[\\/?*[\]:]/g,
                " "
            )
            .trim();

    return name.slice(
        0,
        31
    );
}

function formatDate(
    value
) {

    if (!value)
        return "";

    try {

        return new Date(
            value
        )
            .toLocaleDateString();

    } catch {

        return value;
    }
}

function timestamp() {

    const d =
        new Date();

    const pad =
        n =>
            String(
                n
            ).padStart(
                2,
                "0"
            );

    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function downloadFile(
    buffer,
    fileName
) {

    const blob =
        new Blob(
            [buffer],
            {
                type:
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            }
        );

    const url =
        URL.createObjectURL(
            blob
        );

    const a =
        document.createElement(
            "a"
        );

    a.href =
        url;

    a.download =
        fileName;

    a.click();

    setTimeout(
        () =>
            URL.revokeObjectURL(
                url
            ),
        1000
    );
}
