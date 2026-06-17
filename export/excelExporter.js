const NS_MAIN =
    "http://schemas.openxmlformats.org/spreadsheetml/2006/main";

const NS_REL =
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

const NS_PACKAGE_REL =
    "http://schemas.openxmlformats.org/package/2006/relationships";

const NS_CONTENT_TYPES =
    "http://schemas.openxmlformats.org/package/2006/content-types";

const NS_MARKUP =
    "http://schemas.openxmlformats.org/markup-compatibility/2006";

const INVALID_SHEET_CHARS =
    /[\\/?*[\]:]/g;

const HEADER_STYLE =
    1;

const LINK_STYLE =
    2;

export async function exportResults(
    validationResults
) {

    const results =
        Array.isArray(
            validationResults
        )
            ? validationResults
            : [];

    const sheets =
        buildSheets(
            results
        );

    const files =
        buildWorkbookFiles(
            sheets
        );

    const blob =
        createZip(
            files
        );

    downloadBlob(
        blob,
        `Risk Profiler_Quality_List_${formatTimestamp(
            new Date()
        )}.xlsx`
    );
}

function buildSheets(
    results
) {

    const usedSheetNames =
        new Set();

    const assessmentSheets =
        results.map(
            (
                result,
                index
            ) => {

                const assessment =
                    getAssessment(
                        result
                    );

                const sheetName =
                    createSheetName(
                        result,
                        assessment,
                        index,
                        usedSheetNames
                    );

                return {

                    id:
                        index + 2,

                    name:
                        sheetName,

                    rows:
                        buildAssessmentRows(
                            result,
                            assessment
                        )
                };
            }
        );

    return [

        {
            id:
                1,

            name:
                "All Assessments",

            rows:
                buildAllAssessmentsRows(
                    results,
                    assessmentSheets
                )
        },

        ...assessmentSheets
    ];
}

function buildAllAssessmentsRows(
    results,
    assessmentSheets
) {

    const rows = [

        [
            cell(
                "Open Sheet",
                HEADER_STYLE
            ),
            cell(
                "Assessment ID",
                HEADER_STYLE
            ),
            cell(
                "Application",
                HEADER_STYLE
            ),
            cell(
                "Asset ID",
                HEADER_STYLE
            ),
            cell(
                "Lifecycle",
                HEADER_STYLE
            ),
            cell(
                "Application Manager",
                HEADER_STYLE
            ),
            cell(
                "System Owner",
                HEADER_STYLE
            ),
            cell(
                "Owning Business Unit",
                HEADER_STYLE
            ),
            cell(
                "Survey Completed On",
                HEADER_STYLE
            ),
            cell(
                "Attested On",
                HEADER_STYLE
            ),
            cell(
                "Attested By",
                HEADER_STYLE
            ),
            cell(
                "Passed",
                HEADER_STYLE
            ),
            cell(
                "Failed",
                HEADER_STYLE
            ),
            cell(
                "N/A",
                HEADER_STYLE
            ),
            cell(
                "Score",
                HEADER_STYLE
            ),
            cell(
                "Error",
                HEADER_STYLE
            )
        ]
    ];

    results.forEach(
        (
            result,
            index
        ) => {

            const assessment =
                getAssessment(
                    result
                );

            const summary =
                result.summary || {};

            rows.push([

                cell(
                    "Open Sheet",
                    LINK_STYLE,
                    `#'${escapeFormulaSheetName(
                        assessmentSheets[index].name
                    )}'!A1`
                ),
                assessment.assessmentId,
                assessment.assetName,
                assessment.assetId,
                assessment.lifeCycle,
                assessment.appMgrName,
                assessment.sysOwnerName,
                assessment.owningBusUnit,
                assessment.surveyCompletedOn,
                assessment.attestOn,
                assessment.attestName,
                summary.passed,
                summary.failed,
                summary.na,
                formatScore(
                    summary.score
                ),
                result.error || ""
            ]);
        }
    );

    return rows;
}

function buildAssessmentRows(
    result,
    assessment
) {

    const summary =
        result.summary || {};

    const rows = [

        [
            cell(
                "Assessment Details",
                HEADER_STYLE
            ),
            ""
        ],
        [
            "Assessment ID",
            assessment.assessmentId
        ],
        [
            "Application",
            assessment.assetName
        ],
        [
            "Asset ID",
            assessment.assetId
        ],
        [
            "Lifecycle",
            assessment.lifeCycle
        ],
        [
            "Application Manager",
            assessment.appMgrName
        ],
        [
            "System Owner",
            assessment.sysOwnerName
        ],
        [
            "Owning Business Unit",
            assessment.owningBusUnit
        ],
        [
            "Survey Completed On",
            assessment.surveyCompletedOn
        ],
        [
            "Attested On",
            assessment.attestOn
        ],
        [
            "Attested By",
            assessment.attestName
        ],
        [],
        [
            cell(
                "Validation Summary",
                HEADER_STYLE
            ),
            ""
        ],
        [
            "Passed",
            summary.passed
        ],
        [
            "Failed",
            summary.failed
        ],
        [
            "N/A",
            summary.na
        ],
        [
            "Score",
            formatScore(
                summary.score
            )
        ]
    ];

    if (
        result.error
    ) {

        rows.push(
            [],
            [
                cell(
                    "Error",
                    HEADER_STYLE
                ),
                result.error
            ]
        );

        return rows;
    }

    rows.push(
        [],
        [
            cell(
                "Rule",
                HEADER_STYLE
            ),
            cell(
                "Status",
                HEADER_STYLE
            ),
            cell(
                "Reason",
                HEADER_STYLE
            )
        ]
    );

    (
        result.results || []
    ).forEach(rule => {

        rows.push([

            rule.id,
            rule.status,
            rule.reason
        ]);
    });

    return rows;
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

        ...(
            result.assessment || {}
        )
    };
}

function buildWorkbookFiles(
    sheets
) {

    const files = {};

    files["[Content_Types].xml"] =
        buildContentTypes(
            sheets
        );

    files["_rels/.rels"] =
        buildRootRelationships();

    files["xl/workbook.xml"] =
        buildWorkbookXml(
            sheets
        );

    files["xl/_rels/workbook.xml.rels"] =
        buildWorkbookRelationships(
            sheets
        );

    files["xl/styles.xml"] =
        buildStylesXml();

    sheets.forEach(
        (
            sheet,
            index
        ) => {

            files[
                `xl/worksheets/sheet${index + 1}.xml`
            ] =
                buildWorksheetXml(
                    sheet.rows
                );
        }
    );

    return files;
}

function buildContentTypes(
    sheets
) {

    const sheetOverrides =
        sheets.map(
            (
                _sheet,
                index
            ) =>
                `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
        )
        .join("");

    return xml(
        `<Types xmlns="${NS_CONTENT_TYPES}">
            <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
            <Default Extension="xml" ContentType="application/xml"/>
            <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
            <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
            ${sheetOverrides}
        </Types>`
    );
}

function buildRootRelationships() {

    return xml(
        `<Relationships xmlns="${NS_PACKAGE_REL}">
            <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
        </Relationships>`
    );
}

function buildWorkbookXml(
    sheets
) {

    const sheetXml =
        sheets.map(
            (
                sheet,
                index
            ) =>
                `<sheet name="${escapeXmlAttribute(
                    sheet.name
                )}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
        )
        .join("");

    return xml(
        `<workbook xmlns="${NS_MAIN}" xmlns:r="${NS_REL}">
            <sheets>${sheetXml}</sheets>
        </workbook>`
    );
}

function buildWorkbookRelationships(
    sheets
) {

    const sheetRelationships =
        sheets.map(
            (
                _sheet,
                index
            ) =>
                `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
        )
        .join("");

    return xml(
        `<Relationships xmlns="${NS_PACKAGE_REL}">
            ${sheetRelationships}
            <Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
        </Relationships>`
    );
}

function buildStylesXml() {

    return xml(
        `<styleSheet xmlns="${NS_MAIN}">
            <fonts count="3">
                <font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font>
                <font><b/><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font>
                <font><u/><sz val="11"/><color rgb="FF0563C1"/><name val="Calibri"/><family val="2"/></font>
            </fonts>
            <fills count="3">
                <fill><patternFill patternType="none"/></fill>
                <fill><patternFill patternType="gray125"/></fill>
                <fill><patternFill patternType="solid"><fgColor rgb="FFD9EAF7"/><bgColor indexed="64"/></patternFill></fill>
            </fills>
            <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
            <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
            <cellXfs count="3">
                <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
                <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
                <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
            </cellXfs>
            <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
        </styleSheet>`
    );
}

function buildWorksheetXml(
    rows
) {

    const hyperlinks = [];

    const rowXml =
        rows.map(
            (
                row,
                rowIndex
            ) =>
                buildRowXml(
                    row,
                    rowIndex + 1,
                    hyperlinks
                )
        )
        .join("");

    const hyperlinkXml =
        hyperlinks.length
            ? `<hyperlinks>${hyperlinks.join("")}</hyperlinks>`
            : "";

    return xml(
        `<worksheet xmlns="${NS_MAIN}" xmlns:r="${NS_REL}" xmlns:mc="${NS_MARKUP}" >
            <sheetViews><sheetView workbookViewId="0"/></sheetViews>
            <sheetFormatPr defaultRowHeight="15"/>
            <sheetData>${rowXml}</sheetData>
            ${hyperlinkXml}
            <pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>
        </worksheet>`
    );
}

function buildRowXml(
    row,
    rowNumber,
    hyperlinks
) {

    const cells =
        row.map(
            (
                value,
                columnIndex
            ) =>
                buildCellXml(
                    normalizeCell(
                        value
                    ),
                    columnIndex + 1,
                    rowNumber,
                    hyperlinks
                )
        )
        .join("");

    return `<row r="${rowNumber}">${cells}</row>`;
}

function buildCellXml(
    value,
    columnNumber,
    rowNumber,
    hyperlinks
) {

    const ref =
        `${columnName(
            columnNumber
        )}${rowNumber}`;

    const style =
        value.style
            ? ` s="${value.style}"`
            : "";

    if (
        value.hyperlink
    ) {

        hyperlinks.push(
            `<hyperlink ref="${ref}" location="${escapeXmlAttribute(
                value.hyperlink.slice(
                    1
                )
            )}" display="${escapeXmlAttribute(
                value.value
            )}"/>`
        );
    }

    if (
        value.value === null ||
        value.value === undefined ||
        value.value === ""
    ) {

        return `<c r="${ref}"${style}/>`;
    }

    if (
        typeof value.value === "number" &&
        Number.isFinite(
            value.value
        )
    ) {

        return `<c r="${ref}"${style}><v>${value.value}</v></c>`;
    }

    return `<c r="${ref}" t="inlineStr"${style}><is><t>${escapeXmlText(
        String(
            value.value
        )
    )}</t></is></c>`;
}

function cell(
    value,
    style,
    hyperlink
) {

    return {
        value,
        style,
        hyperlink
    };
}

function normalizeCell(
    value
) {

    if (
        value &&
        typeof value === "object" &&
        Object.prototype.hasOwnProperty.call(
            value,
            "value"
        )
    ) {

        return value;
    }

    return {
        value
    };
}

function createSheetName(
    result,
    assessment,
    index,
    usedSheetNames
) {

    const source =
        [
            assessment.assessmentId,
            assessment.assetName || result.assetName || `Assessment ${index + 1}`
        ]
        .filter(Boolean)
        .join(" ");

    const base =
        sanitizeSheetName(
            source
        );

    let name =
        base;

    let counter = 2;

    while (
        usedSheetNames.has(
            name.toLowerCase()
        )
    ) {

        const suffix =
            ` ${counter}`;

        name =
            `${base.slice(
                0,
                31 - suffix.length
            )}${suffix}`;

        counter++;
    }

    usedSheetNames.add(
        name.toLowerCase()
    );

    return name;
}

function sanitizeSheetName(
    value
) {

    const cleaned =
        String(
            value || "Assessment"
        )
            .replace(
                INVALID_SHEET_CHARS,
                " "
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim();

    return (
        cleaned || "Assessment"
    ).slice(
        0,
        31
    );
}

function escapeFormulaSheetName(
    name
) {

    return String(
        name
    ).replace(
        /'/g,
        "''"
    );
}

function formatScore(
    score
) {

    if (
        score === null ||
        score === undefined ||
        score === ""
    ) {

        return "";
    }

    return `${score}%`;
}

function formatTimestamp(
    date
) {

    const pad =
        value =>
            String(
                value
            ).padStart(
                2,
                "0"
            );

    return [
        date.getFullYear(),
        pad(
            date.getMonth() + 1
        ),
        pad(
            date.getDate()
        )
    ].join("") +
        "_" +
        [
            pad(
                date.getHours()
            ),
            pad(
                date.getMinutes()
            ),
            pad(
                date.getSeconds()
            )
        ].join("");
}

function xml(
    body
) {

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${body}`;
}

function escapeXmlText(
    value
) {

    return String(
        value
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        );
}

function escapeXmlAttribute(
    value
) {

    return escapeXmlText(
        value
    )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&apos;"
        );
}

function columnName(
    columnNumber
) {

    let name = "";

    let current =
        columnNumber;

    while (
        current > 0
    ) {

        const remainder =
            (
                current - 1
            ) % 26;

        name =
            String.fromCharCode(
                65 + remainder
            ) + name;

        current =
            Math.floor(
                (
                    current - 1
                ) / 26
            );
    }

    return name;
}

function createZip(
    files
) {

    const encoder =
        new TextEncoder();

    const entries = [];

    let offset = 0;

    Object.entries(
        files
    ).forEach(
        ([
            name,
            content
        ]) => {

            const nameBytes =
                encoder.encode(
                    name
                );

            const contentBytes =
                encoder.encode(
                    content
                );

            const crc =
                crc32(
                    contentBytes
                );

            const localHeader =
                buildLocalFileHeader(
                    nameBytes,
                    contentBytes,
                    crc
                );

            entries.push({

                nameBytes,
                contentBytes,
                crc,
                offset,
                localHeader
            });

            offset +=
                localHeader.length +
                contentBytes.length;
        }
    );

    const centralDirectoryParts =
        entries.map(
            entry =>
                buildCentralDirectoryHeader(
                    entry
                )
        );

    const centralDirectorySize =
        centralDirectoryParts.reduce(
            (
                total,
                part
            ) =>
                total + part.length,
            0
        );

    const endRecord =
        buildEndOfCentralDirectory(
            entries.length,
            centralDirectorySize,
            offset
        );

    const parts = [];

    entries.forEach(entry => {

        parts.push(
            entry.localHeader,
            entry.contentBytes
        );
    });

    parts.push(
        ...centralDirectoryParts,
        endRecord
    );

    return new Blob(
        parts,
        {
            type:
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        }
    );
}

function buildLocalFileHeader(
    nameBytes,
    contentBytes,
    crc
) {

    const header =
        new Uint8Array(
            30 + nameBytes.length
        );

    const view =
        new DataView(
            header.buffer
        );

    view.setUint32(
        0,
        0x04034b50,
        true
    );
    view.setUint16(
        4,
        20,
        true
    );
    view.setUint16(
        6,
        0,
        true
    );
    view.setUint16(
        8,
        0,
        true
    );
    view.setUint32(
        14,
        crc,
        true
    );
    view.setUint32(
        18,
        contentBytes.length,
        true
    );
    view.setUint32(
        22,
        contentBytes.length,
        true
    );
    view.setUint16(
        26,
        nameBytes.length,
        true
    );

    header.set(
        nameBytes,
        30
    );

    return header;
}

function buildCentralDirectoryHeader(
    entry
) {

    const header =
        new Uint8Array(
            46 + entry.nameBytes.length
        );

    const view =
        new DataView(
            header.buffer
        );

    view.setUint32(
        0,
        0x02014b50,
        true
    );
    view.setUint16(
        4,
        20,
        true
    );
    view.setUint16(
        6,
        20,
        true
    );
    view.setUint16(
        10,
        0,
        true
    );
    view.setUint32(
        16,
        entry.crc,
        true
    );
    view.setUint32(
        20,
        entry.contentBytes.length,
        true
    );
    view.setUint32(
        24,
        entry.contentBytes.length,
        true
    );
    view.setUint16(
        28,
        entry.nameBytes.length,
        true
    );
    view.setUint32(
        42,
        entry.offset,
        true
    );

    header.set(
        entry.nameBytes,
        46
    );

    return header;
}

function buildEndOfCentralDirectory(
    entryCount,
    centralDirectorySize,
    centralDirectoryOffset
) {

    const record =
        new Uint8Array(
            22
        );

    const view =
        new DataView(
            record.buffer
        );

    view.setUint32(
        0,
        0x06054b50,
        true
    );
    view.setUint16(
        8,
        entryCount,
        true
    );
    view.setUint16(
        10,
        entryCount,
        true
    );
    view.setUint32(
        12,
        centralDirectorySize,
        true
    );
    view.setUint32(
        16,
        centralDirectoryOffset,
        true
    );

    return record;
}

function crc32(
    bytes
) {

    let crc =
        0xffffffff;

    for (
        let i = 0;
        i < bytes.length;
        i++
    ) {

        crc ^=
            bytes[i];

        for (
            let bit = 0;
            bit < 8;
            bit++
        ) {

            crc =
                (
                    crc >>> 1
                ) ^
                (
                    0xedb88320 &
                    -(
                        crc & 1
                    )
                );
        }
    }

    return (
        crc ^ 0xffffffff
    ) >>> 0;
}

function downloadBlob(
    blob,
    fileName
) {

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

    URL.revokeObjectURL(
        url
    );
}
