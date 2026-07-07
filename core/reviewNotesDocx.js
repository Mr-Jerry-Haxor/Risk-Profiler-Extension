const WORD_NAMESPACE =
    "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

const WORD14_NAMESPACE =
    "http://schemas.microsoft.com/office/word/2010/wordml";

const MARKUP_COMPATIBILITY_NAMESPACE =
    "http://schemas.openxmlformats.org/markup-compatibility/2006";

const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
    <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
    <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>`;

const PACKAGE_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const DOCUMENT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`;

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="${WORD_NAMESPACE}">
    <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
        <w:name w:val="Normal"/>
        <w:qFormat/>
        <w:rPr>
            <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/>
            <w:sz w:val="22"/>
            <w:szCs w:val="22"/>
        </w:rPr>
    </w:style>
    <w:style w:type="paragraph" w:styleId="Title">
        <w:name w:val="Title"/>
        <w:basedOn w:val="Normal"/>
        <w:qFormat/>
        <w:rPr>
            <w:b/>
            <w:color w:val="1F2937"/>
            <w:sz w:val="32"/>
        </w:rPr>
    </w:style>
    <w:style w:type="paragraph" w:styleId="Heading1">
        <w:name w:val="heading 1"/>
        <w:basedOn w:val="Normal"/>
        <w:qFormat/>
        <w:rPr>
            <w:b/>
            <w:color w:val="315FD6"/>
            <w:sz w:val="26"/>
        </w:rPr>
    </w:style>
</w:styles>`;

const SETTINGS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="${WORD_NAMESPACE}">
    <w:updateFields w:val="true"/>
</w:settings>`;

const encoder =
    new TextEncoder();

const crcTable =
    buildCrcTable();

export async function downloadReviewNotesDocx(
    review
) {

    const blob =
        new Blob(
            [
                createDocxPackage(review)
            ],
            {
                type:
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            }
        );

    const url =
        URL.createObjectURL(blob);

    const anchor =
        document.createElement("a");

    anchor.href =
        url;

    anchor.download =
        `${safeFileName(review?.assetName || "application")}_RISK-PRofiler_review_notes.docx`;

    anchor.click();

    URL.revokeObjectURL(url);
}

function createDocxPackage(
    review
) {

    return zipFiles([
        {
            name:
                "[Content_Types].xml",
            content:
                CONTENT_TYPES_XML
        },
        {
            name:
                "_rels/.rels",
            content:
                PACKAGE_RELS_XML
        },
        {
            name:
                "word/document.xml",
            content:
                buildDocumentXml(review)
        },
        {
            name:
                "word/_rels/document.xml.rels",
            content:
                DOCUMENT_RELS_XML
        },
        {
            name:
                "word/styles.xml",
            content:
                STYLES_XML
        },
        {
            name:
                "word/settings.xml",
            content:
                SETTINGS_XML
        }
    ]);
}

function buildDocumentXml(
    review
) {

    const contacts =
        review?.contacts || [];

    const body = [
        paragraph(
            [
                run(
                    `${review?.assetName || "Application"} Risk Profiler Review Notes`,
                    {
                        bold:
                            true
                    }
                )
            ],
            {
                style:
                    "Title",
                spacingAfter:
                    260
            }
        ),
        paragraph(
            [
                run("Application Details", {
                    bold:
                        true
                })
            ],
            {
                style:
                    "Heading1"
            }
        ),
        detailsTable([
            [
                "Application Name",
                review?.assetName || "N/A"
            ],
            [
                "Due Date",
                formatDate(review?.dueOn) || "N/A"
            ],
            [
                "Survey Completed On (Last)",
                formatDate(review?.surveyCompletedOn) || "N/A"
            ],
            [
                "Review Assessment Date",
                formatDate(review?.reviewedAt) || "N/A"
            ]
        ]),
        paragraph(
            [
                run("Contacts", {
                    bold:
                        true
                })
            ],
            {
                style:
                    "Heading1",
                spacingBefore:
                    180
            }
        ),
        contactsTable(contacts),
        paragraph(
            [
                run("Review Output", {
                    bold:
                        true
                })
            ],
            {
                style:
                    "Heading1",
                spacingBefore:
                    220
            }
        ),
        reviewOutputXml(review?.workQueue || [])
    ].join("");

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
    xmlns:w="${WORD_NAMESPACE}"
    xmlns:w14="${WORD14_NAMESPACE}"
    xmlns:mc="${MARKUP_COMPATIBILITY_NAMESPACE}"
    mc:Ignorable="w14">
    <w:body>
        ${body}
        <w:sectPr>
            <w:pgSz w:w="12240" w:h="15840"/>
            <w:pgMar w:top="720" w:right="720" w:bottom="720" w:left="720" w:header="360" w:footer="360" w:gutter="0"/>
        </w:sectPr>
    </w:body>
</w:document>`;
}

function contactsTable(
    contacts
) {

    if (
        contacts.length === 0
    ) {
        return paragraph([
            run("No Application Manager or Business System Manager details were found.")
        ]);
    }

    const rows = [
        tableRow([
            tableCell("Contact Type", {
                bold:
                    true,
                fill:
                    "E8EEFC"
            }),
            tableCell("Name", {
                bold:
                    true,
                fill:
                    "E8EEFC"
            }),
            tableCell("BEMS ID", {
                bold:
                    true,
                fill:
                    "E8EEFC"
            }),
            tableCell("Email", {
                bold:
                    true,
                fill:
                    "E8EEFC"
            })
        ]),
        ...contacts.map(contact =>
            tableRow([
                tableCell(contact.contactType || "N/A"),
                tableCell(contact.associatedTo || "N/A"),
                tableCell(contact.bemsId || "N/A"),
                tableCell(contact.email || "N/A")
            ])
        )
    ];

    return table(rows);
}

function detailsTable(
    rows
) {

    return table(
        rows.map(([label, value]) =>
            tableRow([
                tableCell(label, {
                    bold:
                        true,
                    fill:
                        "F3F4F6"
                }),
                tableCell(value)
            ])
        )
    );
}

function reviewOutputXml(
    workQueue
) {

    if (
        workQueue.length === 0
    ) {
        return paragraph([
            run("No reachable unanswered work queue items were found.")
        ]);
    }

    return workQueue.map((item, index) => [
        item.status
            ? paragraph(
                [
                    run(item.status, {
                        bold:
                            true,
                        color:
                            "315FD6"
                    })
                ],
                {
                    spacingBefore:
                        index === 0
                            ? 80
                            : 180,
                    spacingAfter:
                        80
                }
            )
            : "",
        categoryQuestionRow(
            item.questionGroup || "N/A",
            item.questionId || "N/A"
        ),
        labelParagraph("Question", item.question || "N/A"),
        labelParagraph("Answer Type", item.answerType || "N/A"),
        item.asaNotes
            ? labelParagraph("ASA Notes", item.asaNotes)
            : "",
        paragraph([
            run("Options", {
                bold:
                    true
            })
        ]),
        ...optionParagraphs(item.options || []),
        separatorParagraph()
    ].join("")).join("");
}

function optionParagraphs(
    options
) {

    const normalized =
        options.length
            ? options
            : [
                {
                    index:
                        1,
                    internalValue:
                        "<no options>"
                }
            ];

    return normalized.map(option =>
        paragraph(
            [
                checkboxControl(),
                run(
                    ` ${option.index || ""}. ${option.internalValue || option.displayValue || "<no options>"}`
                )
            ],
            {
                indentLeft:
                    360,
                spacingAfter:
                    70
            }
        )
    );
}

function categoryQuestionRow(
    category,
    questionId
) {

    return table(
        [
            tableRow([
                tableCellRuns([
                    run("Category: ", {
                        bold:
                            true
                    }),
                    run(category)
                ]),
                tableCellRuns([
                    run("Question ID: ", {
                        bold:
                            true
                    }),
                    run(questionId)
                ], {
                    align:
                        "right"
                })
            ])
        ],
        {
            noBorders:
                true
        }
    );
}

function labelParagraph(
    label,
    value
) {

    return paragraph([
        run(`${label}: `, {
            bold:
                true
        }),
        run(value)
    ]);
}

function checkboxControl() {
    const id =
        Math.floor(
            Math.random() * 1000000000
        );

    return `
        <w:sdt>
            <w:sdtPr>
                <w:id w:val="${id}"/>
                <w14:checkbox>
                    <w14:checked w14:val="0"/>
                    <w14:checkedState w14:val="2612" w14:font="Segoe UI Symbol"/>
                    <w14:uncheckedState w14:val="2610" w14:font="Segoe UI Symbol"/>
                </w14:checkbox>
            </w:sdtPr>
            <w:sdtContent>
                <w:r>
                    <w:rPr>
                        <w:rFonts w:ascii="Segoe UI Symbol" w:hAnsi="Segoe UI Symbol"/>
                        <w:sz w:val="22"/>
                    </w:rPr>
                    <w:t>☐</w:t>
                </w:r>
            </w:sdtContent>
        </w:sdt>`;
}

function separatorParagraph() {
    return paragraph(
        [],
        {
            borderBottom:
                true,
            spacingBefore:
                80,
            spacingAfter:
                140
        }
    );
}

function paragraph(
    runs,
    options = {}
) {

    const props = [];

    if (
        options.style
    ) {
        props.push(`<w:pStyle w:val="${escapeXml(options.style)}"/>`);
    }

    if (
        options.align
    ) {
        props.push(`<w:jc w:val="${options.align}"/>`);
    }

    if (
        options.spacingBefore ||
        options.spacingAfter
    ) {
        props.push(`<w:spacing w:before="${options.spacingBefore || 0}" w:after="${options.spacingAfter || 0}"/>`);
    }

    if (
        options.indentLeft
    ) {
        props.push(`<w:ind w:left="${options.indentLeft}"/>`);
    }

    if (
        options.borderBottom
    ) {
        props.push(`<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="CBD5E1"/></w:pBdr>`);
    }

    return `<w:p>${props.length ? `<w:pPr>${props.join("")}</w:pPr>` : ""}${runs.join("")}</w:p>`;
}

function run(
    text,
    options = {}
) {

    const props = [];

    if (
        options.bold
    ) {
        props.push("<w:b/>");
    }

    if (
        options.color
    ) {
        props.push(`<w:color w:val="${options.color}"/>`);
    }

    return `<w:r>${props.length ? `<w:rPr>${props.join("")}</w:rPr>` : ""}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r>`;
}

function table(
    rows,
    options = {}
) {

    const border =
        options.noBorders
            ? `<w:tblBorders>
                <w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/>
            </w:tblBorders>`
            : `<w:tblBorders>
                <w:top w:val="single" w:sz="6" w:space="0" w:color="9CA3AF"/>
                <w:left w:val="single" w:sz="6" w:space="0" w:color="9CA3AF"/>
                <w:bottom w:val="single" w:sz="6" w:space="0" w:color="9CA3AF"/>
                <w:right w:val="single" w:sz="6" w:space="0" w:color="9CA3AF"/>
                <w:insideH w:val="single" w:sz="6" w:space="0" w:color="9CA3AF"/>
                <w:insideV w:val="single" w:sz="6" w:space="0" w:color="9CA3AF"/>
            </w:tblBorders>`;

    return `<w:tbl>
        <w:tblPr>
            <w:tblW w:w="5000" w:type="pct"/>
            ${border}
        </w:tblPr>
        ${rows.join("")}
    </w:tbl>`;
}

function tableRow(
    cells
) {

    return `<w:tr>${cells.join("")}</w:tr>`;
}

function tableCell(
    text,
    options = {}
) {

    return tableCellRuns([
        run(text || "", {
            bold:
                options.bold
        })
    ], options);
}

function tableCellRuns(
    runs,
    options = {}
) {

    const props = [
        `<w:tcW w:w="2500" w:type="pct"/>`,
        `<w:tcMar><w:top w:w="80" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tcMar>`
    ];

    if (
        options.fill
    ) {
        props.push(`<w:shd w:fill="${options.fill}"/>`);
    }

    return `<w:tc><w:tcPr>${props.join("")}</w:tcPr>${paragraph(runs, {
        align:
            options.align
    })}</w:tc>`;
}

function zipFiles(
    files
) {

    let offset = 0;
    const localParts = [];
    const centralParts = [];

    files.forEach(file => {
        const nameBytes =
            encoder.encode(file.name);

        const contentBytes =
            encoder.encode(file.content);

        const crc =
            crc32(contentBytes);

        localParts.push(
            uint32(0x04034b50),
            uint16(20),
            uint16(0),
            uint16(0),
            uint16(0),
            uint16(0),
            uint32(crc),
            uint32(contentBytes.length),
            uint32(contentBytes.length),
            uint16(nameBytes.length),
            uint16(0),
            nameBytes,
            contentBytes
        );

        centralParts.push(
            uint32(0x02014b50),
            uint16(20),
            uint16(20),
            uint16(0),
            uint16(0),
            uint16(0),
            uint16(0),
            uint32(crc),
            uint32(contentBytes.length),
            uint32(contentBytes.length),
            uint16(nameBytes.length),
            uint16(0),
            uint16(0),
            uint16(0),
            uint16(0),
            uint32(0),
            uint32(offset),
            nameBytes
        );

        offset +=
            30 +
            nameBytes.length +
            contentBytes.length;
    });

    const centralSize =
        byteLength(centralParts);

    const endRecord = [
        uint32(0x06054b50),
        uint16(0),
        uint16(0),
        uint16(files.length),
        uint16(files.length),
        uint32(centralSize),
        uint32(offset),
        uint16(0)
    ];

    return concatUint8Arrays([
        ...localParts,
        ...centralParts,
        ...endRecord
    ]);
}

function buildCrcTable() {
    const table = [];

    for (let i = 0; i < 256; i += 1) {
        let value = i;

        for (let j = 0; j < 8; j += 1) {
            value =
                value & 1
                    ? 0xedb88320 ^ (value >>> 1)
                    : value >>> 1;
        }

        table[i] =
            value >>> 0;
    }

    return table;
}

function crc32(
    bytes
) {

    let crc =
        0xffffffff;

    for (const byte of bytes) {
        crc =
            crcTable[(crc ^ byte) & 0xff] ^
            (crc >>> 8);
    }

    return (crc ^ 0xffffffff) >>> 0;
}

function uint16(
    value
) {

    const bytes =
        new Uint8Array(2);

    const view =
        new DataView(bytes.buffer);

    view.setUint16(
        0,
        value,
        true
    );

    return bytes;
}

function uint32(
    value
) {

    const bytes =
        new Uint8Array(4);

    const view =
        new DataView(bytes.buffer);

    view.setUint32(
        0,
        value >>> 0,
        true
    );

    return bytes;
}

function concatUint8Arrays(
    arrays
) {

    const totalLength =
        byteLength(arrays);

    const output =
        new Uint8Array(totalLength);

    let offset = 0;

    arrays.forEach(array => {
        output.set(
            array,
            offset
        );

        offset +=
            array.length;
    });

    return output;
}

function byteLength(
    arrays
) {

    return arrays.reduce(
        (total, array) =>
            total + array.length,
        0
    );
}

function escapeXml(
    value
) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function formatDate(
    value
) {

    if (!value) {
        return "";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return String(value);
    }

    return date.toLocaleDateString(
        undefined,
        {
            year:
                "numeric",
            month:
                "short",
            day:
                "2-digit"
        }
    );
}

function formatDateTime(
    value
) {

    if (!value) {
        return "";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return String(value);
    }

    return date.toLocaleString(
        undefined,
        {
            year:
                "numeric",
            month:
                "short",
            day:
                "2-digit",
            hour:
                "2-digit",
            minute:
                "2-digit"
        }
    );
}

function safeFileName(
    value
) {

    return String(value)
        .trim()
        .replace(/[\\/:*?"<>|]+/g, "_")
        .replace(/\s+/g, "_")
        .replace(/^_+|_+$/g, "") ||
        "application";
}
