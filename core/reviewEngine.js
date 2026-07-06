import {
    CONFIG
} from "../utils/constants.js";

import {
    getAssessmentAnswers,
    getAssessmentContacts,
    getAssessmentDetail,
    getRiskProfilerSurveyTemplates,
    getSurveyQuestions,
    getSurveyTemplateDetails
} from "../api/cairoApi.js";

const MAX_CONCURRENT_REVIEWS = 3;

const REVIEW_CONTACT_TYPES =
    new Set([
        "Responsible Manager",
        "Primary Contact"
    ]);

function cleanText(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/\u00a0/g, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function compareText(value) {
    return cleanText(value)
        .toLocaleLowerCase()
        .replace(/[–—‑]/g, "-")
        .replace(/[^\w\s/-]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

function safeArray(value) {
    return Array.isArray(value)
        ? value
        : [];
}

function loadAnswerList(data) {
    if (Array.isArray(data)) {
        return data;
    }

    if (
        data &&
        Array.isArray(data.answers)
    ) {
        return data.answers;
    }

    return [];
}

function category(question) {
    const group =
        question?.questionGroup || {};

    return cleanText(
        group.longDescription ||
        group.shortDescription ||
        ""
    );
}

function groupSort(question) {
    return Number(
        question?.questionGroup?.questionGroupSortOn ||
        0
    );
}

function questionOrderKey(question) {
    return [
        groupSort(question),
        Number(question?.sortOn || 0),
        Number(question?.surveyTemplateQuestionId || 0)
    ];
}

function compareQuestionOrder(left, right) {
    const a =
        questionOrderKey(left);

    const b =
        questionOrderKey(right);

    for (let i = 0; i < a.length; i += 1) {
        if (a[i] !== b[i]) {
            return a[i] - b[i];
        }
    }

    return 0;
}

function sortedQuestions(questions) {
    return safeArray(questions)
        .slice()
        .sort(compareQuestionOrder);
}

function answerType(question) {
    if (
        question?.questionType ===
        "No Answer Question"
    ) {
        return "no answer";
    }

    return question?.multipleAnswersAllowed === "Y"
        ? "multi select"
        : "single select";
}

function optionValues(question) {
    return safeArray(question?.options)
        .slice()
        .sort((a, b) => {
            const sortA =
                a?.sortOn ?? 1000000000;

            const sortB =
                b?.sortOn ?? 1000000000;

            if (sortA !== sortB) {
                return sortA - sortB;
            }

            return cleanText(
                a?.internalValue ??
                a?.displayValue
            ).localeCompare(
                cleanText(
                    b?.internalValue ??
                    b?.displayValue
                )
            );
        })
        .map(option =>
            cleanText(
                option?.internalValue ??
                option?.displayValue
            )
        );
}

function optionDetails(question) {
    return safeArray(question?.options)
        .slice()
        .sort((a, b) => {
            const sortA =
                a?.sortOn ?? 1000000000;

            const sortB =
                b?.sortOn ?? 1000000000;

            if (sortA !== sortB) {
                return sortA - sortB;
            }

            return cleanText(
                a?.internalValue ??
                a?.displayValue
            ).localeCompare(
                cleanText(
                    b?.internalValue ??
                    b?.displayValue
                )
            );
        })
        .map((option, index) => ({
            index:
                index + 1,
            internalValue:
                cleanText(option?.internalValue),
            displayValue:
                cleanText(option?.displayValue),
            sortOn:
                option?.sortOn ?? null
        }));
}

function optionLookup(question) {
    const lookup =
        new Map();

    for (const value of optionValues(question)) {
        lookup.set(
            compareText(value),
            value
        );
    }

    return lookup;
}

function rawAnswerValues(answer) {
    if (!answer) {
        return [];
    }

    return safeArray(answer.answerOptions)
        .map(option =>
            cleanText(option?.internalValue)
        )
        .filter(Boolean);
}

function answerTimestamp(answer) {
    return cleanText(
        answer?.updatedOn ||
        answer?.createdOn ||
        ""
    );
}

function canonicalizeAnswerValues(
    answer,
    question
) {
    if (!answer) {
        return {
            valid:
                [],
            invalid:
                []
        };
    }

    const lookup =
        optionLookup(question);

    const valid = [];
    const invalid = [];

    for (const value of rawAnswerValues(answer)) {
        const key =
            compareText(value);

        if (lookup.has(key)) {
            valid.push(
                lookup.get(key)
            );
        } else if (
            question?.otherOptionAllowed === "Y" &&
            ["other", "others"].includes(key)
        ) {
            valid.push(
                "Other"
            );
        } else {
            invalid.push(value);
        }
    }

    return {
        valid,
        invalid
    };
}

function answerIsValidForQuestion(
    answer,
    question
) {
    const result =
        canonicalizeAnswerValues(
            answer,
            question
        );

    return result.valid.length > 0 &&
        result.invalid.length === 0;
}

function usableAnswerValues(
    answer,
    question
) {
    const result =
        canonicalizeAnswerValues(
            answer,
            question
        );

    if (
        result.invalid.length > 0 ||
        result.valid.length === 0
    ) {
        return new Set();
    }

    return new Set(result.valid);
}

function synthesizeNewAnswersFromOld(
    oldAnswers,
    newByAlt
) {
    const synthesized = [];

    for (const answer of safeArray(oldAnswers)) {
        const alt =
            answer?.alternateQuestionId;

        if (
            !alt ||
            !newByAlt.has(alt)
        ) {
            continue;
        }

        const clone = {
            ...answer,
            _syntheticFromOldAnswers:
                true,
            surveyTemplateQuestionId:
                Number(
                    newByAlt.get(alt)
                        .surveyTemplateQuestionId
                )
        };

        synthesized.push(clone);
    }

    return synthesized;
}

function normalizeAnswersByAlt(
    answers,
    newByAlt
) {
    const buckets =
        new Map();

    for (const answer of safeArray(answers)) {
        const alt =
            answer?.alternateQuestionId;

        if (!alt) {
            continue;
        }

        if (!buckets.has(alt)) {
            buckets.set(
                alt,
                []
            );
        }

        buckets.get(alt)
            .push(answer);
    }

    const selected =
        new Map();

    for (const [alt, items] of buckets.entries()) {
        const question =
            newByAlt.get(alt);

        const newQid =
            question
                ? Number(question.surveyTemplateQuestionId)
                : null;

        const scoreAnswer = answer => {
            const answerQid =
                Number(answer?.surveyTemplateQuestionId || -1);

            return [
                newQid !== null && answerQid === newQid
                    ? 1
                    : 0,
                question &&
                answerIsValidForQuestion(answer, question)
                    ? 1
                    : 0,
                !answer?.previousAssessmentId
                    ? 1
                    : 0,
                answerTimestamp(answer)
            ];
        };

        const sorted =
            items.slice()
                .sort((a, b) => {
                    const scoreA =
                        scoreAnswer(a);

                    const scoreB =
                        scoreAnswer(b);

                    for (let i = 0; i < scoreA.length; i += 1) {
                        if (scoreA[i] > scoreB[i]) {
                            return -1;
                        }

                        if (scoreA[i] < scoreB[i]) {
                            return 1;
                        }
                    }

                    return 0;
                });

        selected.set(
            alt,
            sorted[0]
        );
    }

    return selected;
}

function mapAnswersToNewIds(
    answersByAlt,
    newByAlt
) {
    const mapped =
        new Map();

    for (const [alt, answer] of answersByAlt.entries()) {
        const question =
            newByAlt.get(alt);

        if (!question) {
            continue;
        }

        const values =
            usableAnswerValues(
                answer,
                question
            );

        if (values.size > 0) {
            mapped.set(
                Number(question.surveyTemplateQuestionId),
                values
            );
        }
    }

    return mapped;
}

function questionSignature(question) {
    return {
        category:
            compareText(category(question)),
        questionText:
            compareText(question?.questionText),
        questionType:
            question?.questionType,
        questionTypeId:
            question?.questionTypeId,
        multipleAnswersAllowed:
            question?.multipleAnswersAllowed,
        otherOptionAllowed:
            question?.otherOptionAllowed,
        displayAnswerAsCheckbox:
            question?.displayAnswerAsCheckbox,
        optionsSet:
            optionValues(question)
                .map(compareText)
                .sort(),
        optionsOrder:
            optionValues(question)
                .map(compareText)
    };
}

function arraysEqual(left, right) {
    if (left.length !== right.length) {
        return false;
    }

    return left.every(
        (value, index) =>
            value === right[index]
    );
}

function compareQuestionReasons(
    oldQuestion,
    newQuestion
) {
    if (!oldQuestion) {
        return [
            "NEW_QUESTION"
        ];
    }

    const oldSig =
        questionSignature(oldQuestion);

    const newSig =
        questionSignature(newQuestion);

    const reasons = [];

    const fields = [
        "category",
        "questionText",
        "questionType",
        "questionTypeId",
        "multipleAnswersAllowed",
        "otherOptionAllowed",
        "displayAnswerAsCheckbox"
    ];

    for (const field of fields) {
        if (oldSig[field] !== newSig[field]) {
            reasons.push(
                "QUESTION_CHANGED"
            );
        }
    }

    if (
        !arraysEqual(
            oldSig.optionsSet,
            newSig.optionsSet
        ) ||
        !arraysEqual(
            oldSig.optionsOrder,
            newSig.optionsOrder
        )
    ) {
        reasons.push(
            "OPTIONS_CHANGED"
        );
    }

    return [
        ...new Set(reasons)
    ];
}

function statusLabel(
    oldQuestion,
    newQuestion,
    activeAnswer
) {
    const reasons =
        compareQuestionReasons(
            oldQuestion,
            newQuestion
        );

    const labels = [];

    if (reasons.includes("NEW_QUESTION")) {
        labels.push("New question");
    }

    if (reasons.includes("QUESTION_CHANGED")) {
        labels.push("Question Changed");
    }

    if (reasons.includes("OPTIONS_CHANGED")) {
        labels.push("Options Changed");
    }

    if (labels.length === 0) {
        if (!activeAnswer) {
            labels.push("No Generated Answer");
        } else if (
            !answerIsValidForQuestion(
                activeAnswer,
                newQuestion
            )
        ) {
            labels.push("Invalid Carried Answer");
        } else {
            labels.push("Needs Answer");
        }
    }

    return labels.join(" / ");
}

function defaultNextQuestionId(
    qid,
    ordered,
    indexById
) {
    const index =
        indexById.get(qid);

    if (
        index === undefined ||
        index + 1 >= ordered.length
    ) {
        return null;
    }

    return Number(
        ordered[index + 1]
            .surveyTemplateQuestionId
    );
}

function nextGroupQuestionId(
    question,
    ordered
) {
    const currentGroupSort =
        groupSort(question);

    for (const item of ordered) {
        if (groupSort(item) > currentGroupSort) {
            return Number(
                item.surveyTemplateQuestionId
            );
        }
    }

    return null;
}

function actionTarget(
    action,
    question,
    ordered
) {
    if (action?.navigateToSurveyEnd === "Y") {
        return null;
    }

    if (
        action?.navigateToNextQuestionGroup === "Y"
    ) {
        return nextGroupQuestionId(
            question,
            ordered
        );
    }

    if (action?.navigateToSurveyTemplateQuestionId) {
        return Number(
            action.navigateToSurveyTemplateQuestionId
        );
    }

    return null;
}

function sortedRouteActions(question) {
    return safeArray(question?.actions)
        .filter(
            action =>
                action?.actionTypeCode === "R"
        )
        .sort((a, b) => {
            const keysA = [
                a?.sortOn === null ||
                a?.sortOn === undefined
                    ? 1
                    : 0,
                a?.sortOn || 0,
                a?.initialAction === "Y"
                    ? 0
                    : 1,
                a?.surveyTemplateActionId || 0
            ];

            const keysB = [
                b?.sortOn === null ||
                b?.sortOn === undefined
                    ? 1
                    : 0,
                b?.sortOn || 0,
                b?.initialAction === "Y"
                    ? 0
                    : 1,
                b?.surveyTemplateActionId || 0
            ];

            for (let i = 0; i < keysA.length; i += 1) {
                if (keysA[i] !== keysB[i]) {
                    return keysA[i] - keysB[i];
                }
            }

            return 0;
        });
}

function actionHasRoute(action) {
    return Boolean(
        action?.navigateToSurveyTemplateQuestionId ||
        action?.navigateToNextQuestionGroup === "Y" ||
        action?.navigateToSurveyEnd === "Y"
    );
}

function logicPossibleValues(
    logic,
    answersById,
    byId
) {
    const refQid =
        Number(logic?.surveyTemplateQuestionId);

    if (Number.isNaN(refQid)) {
        return new Set([
            true,
            false
        ]);
    }

    const selected =
        answersById.get(refQid);

    const operationId =
        Number(logic?.operationId || 0);

    const expected =
        cleanText(logic?.evaluationValue);

    if (selected !== undefined) {
        if ([1, 4].includes(operationId)) {
            return new Set([
                selected.has(expected)
            ]);
        }

        if (operationId === 2) {
            return new Set([
                !selected.has(expected)
            ]);
        }

        return new Set([
            true,
            false
        ]);
    }

    const refQuestion =
        byId.get(refQid);

    const options =
        new Set(
            refQuestion
                ? optionValues(refQuestion)
                : []
        );

    const expectedSelectable =
        options.has(expected) ||
        options.size === 0;

    if ([1, 4].includes(operationId)) {
        return expectedSelectable
            ? new Set([true, false])
            : new Set([false]);
    }

    if (operationId === 2) {
        return expectedSelectable
            ? new Set([true, false])
            : new Set([true]);
    }

    return new Set([
        true,
        false
    ]);
}

function actionPossibleValues(
    action,
    answersById,
    byId
) {
    const logics =
        safeArray(action?.logics);

    if (logics.length === 0) {
        return new Set([
            true
        ]);
    }

    const domains =
        logics.map(logic =>
            logicPossibleValues(
                logic,
                answersById,
                byId
            )
        );

    const hasOr =
        logics.some(
            logic =>
                logic?.evaluationCondition === "OR"
        );

    let canTrue;
    let canFalse;

    if (hasOr) {
        canTrue =
            domains.some(domain =>
                domain.has(true)
            );

        canFalse =
            domains.every(domain =>
                domain.has(false)
            );
    } else {
        canTrue =
            domains.every(domain =>
                domain.has(true)
            );

        canFalse =
            domains.some(domain =>
                domain.has(false)
            );
    }

    const result =
        new Set();

    if (canTrue) {
        result.add(true);
    }

    if (canFalse) {
        result.add(false);
    }

    return result;
}

function possibleRoutingTargets(
    qid,
    byId,
    ordered,
    indexById,
    answersById
) {
    const question =
        byId.get(qid);

    const targets =
        new Set();

    let canReachLaterActions =
        true;

    for (const action of sortedRouteActions(question)) {
        if (
            !actionHasRoute(action) ||
            !canReachLaterActions
        ) {
            continue;
        }

        const domain =
            actionPossibleValues(
                action,
                answersById,
                byId
            );

        if (domain.has(true)) {
            targets.add(
                actionTarget(
                    action,
                    question,
                    ordered
                )
            );
        }

        canReachLaterActions =
            domain.has(false);
    }

    if (canReachLaterActions) {
        targets.add(
            defaultNextQuestionId(
                qid,
                ordered,
                indexById
            )
        );
    }

    return targets;
}

function traverseReachableUnansweredWorkQueue(
    questions,
    answersById
) {
    const ordered =
        sortedQuestions(questions);

    if (ordered.length === 0) {
        return new Set();
    }

    const byId =
        new Map(
            safeArray(questions).map(question => [
                Number(question.surveyTemplateQuestionId),
                question
            ])
        );

    const indexById =
        new Map(
            ordered.map((question, index) => [
                Number(question.surveyTemplateQuestionId),
                index
            ])
        );

    const start =
        Number(
            ordered[0].surveyTemplateQuestionId
        );

    const queue = [
        start
    ];

    const reachable =
        new Set();

    const unanswered =
        new Set();

    while (queue.length > 0) {
        const qid =
            queue.shift();

        if (
            reachable.has(qid) ||
            !byId.has(qid)
        ) {
            continue;
        }

        reachable.add(qid);

        const question =
            byId.get(qid);

        if (
            !answersById.has(qid) &&
            answerType(question) !== "no answer"
        ) {
            unanswered.add(qid);
        }

        for (const target of possibleRoutingTargets(
            qid,
            byId,
            ordered,
            indexById,
            answersById
        )) {
            if (
                target !== null &&
                !reachable.has(Number(target))
            ) {
                queue.push(Number(target));
            }
        }
    }

    return unanswered;
}

function mapByAlternateQuestionId(questions) {
    return new Map(
        safeArray(questions)
            .filter(question =>
                question?.alternateQuestionId
            )
            .map(question => [
                question.alternateQuestionId,
                question
            ])
    );
}

function questionTags(question) {
    const candidates = [
        question?.questionTag,
        question?.questionTags,
        question?.tags,
        question?.riskProfilerTag
    ];

    const tags =
        candidates.flatMap(value => {
            if (Array.isArray(value)) {
                return value;
            }

            if (value) {
                return [value];
            }

            return [];
        });

    return tags
        .map(tag =>
            typeof tag === "object"
                ? cleanText(
                    tag.name ||
                    tag.tag ||
                    tag.description ||
                    JSON.stringify(tag)
                )
                : cleanText(tag)
        )
        .filter(Boolean);
}

function buildWorkQueueBlocks(
    oldQuestions,
    oldAnswers,
    newQuestions,
    newAnswers
) {
    const oldByAlt =
        mapByAlternateQuestionId(oldQuestions);

    const newByAlt =
        mapByAlternateQuestionId(newQuestions);

    const activeAnswersRaw =
        safeArray(newAnswers).length > 0
            ? safeArray(newAnswers)
            : synthesizeNewAnswersFromOld(
                oldAnswers,
                newByAlt
            );

    const activeAnswersByAlt =
        normalizeAnswersByAlt(
            activeAnswersRaw,
            newByAlt
        );

    const activeAnswersById =
        mapAnswersToNewIds(
            activeAnswersByAlt,
            newByAlt
        );

    const workQueueIds =
        traverseReachableUnansweredWorkQueue(
            newQuestions,
            activeAnswersById
        );

    return sortedQuestions(newQuestions)
        .filter(question =>
            workQueueIds.has(
                Number(question.surveyTemplateQuestionId)
            )
        )
        .map(question => {
            const alt =
                question.alternateQuestionId;

            const oldQuestion =
                oldByAlt.get(alt);

            const activeAnswer =
                activeAnswersByAlt.get(alt);

            return {
                status:
                    statusLabel(
                        oldQuestion,
                        question,
                        activeAnswer
                    ),
                questionGroup:
                    category(question),
                questionId:
                    alt || "",
                surveyTemplateQuestionId:
                    question.surveyTemplateQuestionId || "",
                identifiers: {
                    alternateQuestionId:
                        alt || "",
                    surveyTemplateQuestionId:
                        question.surveyTemplateQuestionId || "",
                    questionTypeId:
                        question.questionTypeId || "",
                    questionGroupId:
                        question.questionGroup?.questionGroupId || ""
                },
                tags:
                    questionTags(question),
                question:
                    cleanText(question.questionText),
                questionType:
                    cleanText(question.questionType),
                answerType:
                    answerType(question),
                options:
                    optionDetails(question)
            };
        });
}

function normalizeSurveyTemplates(data) {
    const values =
        Array.isArray(data)
            ? data
            : Object.values(data || {});

    return values
        .filter(item =>
            item &&
            item.surveyTemplateId &&
            item.versionNumber !== undefined &&
            item.versionNumber !== null
        )
        .map(item => ({
            ...item,
            surveyTemplateId:
                Number(item.surveyTemplateId),
            versionNumber:
                Number(item.versionNumber)
        }))
        .filter(item =>
            !Number.isNaN(item.surveyTemplateId) &&
            !Number.isNaN(item.versionNumber)
        );
}

function findLatestReleasedTemplate(
    templates
) {
    return normalizeSurveyTemplates(templates)
        .filter(template =>
            template.releasedOn &&
            !template.deactivatedOn
        )
        .sort((a, b) =>
            b.versionNumber - a.versionNumber
        )[0] || null;
}

function findTemplateById(
    templates,
    surveyTemplateId
) {
    return normalizeSurveyTemplates(templates)
        .find(template =>
            Number(template.surveyTemplateId) ===
            Number(surveyTemplateId)
        ) || null;
}

function getDetailSurveyTemplateId(detail) {
    return detail?.surveyTemplateId ||
        detail?.surveyTemplate?.surveyTemplateId ||
        detail?.assessment?.surveyTemplateId ||
        null;
}

function formatDate(value) {
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
        return cleanText(value);
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

function escapeHtml(value) {
    return cleanText(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function escapeRtf(value) {
    return cleanText(value)
        .replace(/\\/g, "\\\\")
        .replace(/{/g, "\\{")
        .replace(/}/g, "\\}")
        .replace(/\n/g, "\\line ");
}

function contactsHtml(contacts) {
    if (!contacts.length) {
        return "<p><strong>Contacts:</strong> N/A</p>";
    }

    return `
        <table>
            <thead>
                <tr>
                    <th>Contact Type</th>
                    <th>Name</th>
                    <th>Email</th>
                </tr>
            </thead>
            <tbody>
                ${contacts.map(contact => `
                    <tr>
                        <td>${escapeHtml(contact.contactType)}</td>
                        <td>${escapeHtml(contact.associatedTo)}</td>
                        <td>${escapeHtml(contact.email)}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

function filterReviewContacts(contacts) {
    return safeArray(contacts)
        .filter(contact =>
            REVIEW_CONTACT_TYPES.has(
                cleanText(contact?.contactType)
            )
        )
        .sort((a, b) => {
            const order = {
                "Responsible Manager":
                    0,
                "Primary Contact":
                    1
            };

            return (
                order[cleanText(a?.contactType)] ?? 99
            ) - (
                order[cleanText(b?.contactType)] ?? 99
            );
        });
}

function workQueueHtml(
    blocks,
    {
        includeCheckbox = false
    } = {}
) {
    if (!blocks.length) {
        return "<div class=\"review-output-empty\">No reachable unanswered work queue items were found.</div>";
    }

    return blocks.map(block => `
        <section class="review-output-item">
            ${includeCheckbox
                ? `<label class="review-output-check-row">
                    <input type="checkbox">
                    <span class="review-output-status">${escapeHtml(block.status)}</span>
                </label>`
                : `<div class="review-output-status">${escapeHtml(block.status)}</div>`}
            <dl>
                <div>
                    <dt>Category</dt>
                    <dd>${escapeHtml(block.questionGroup || "N/A")}</dd>
                </div>
                <div>
                    <dt>Question ID</dt>
                    <dd>${escapeHtml(block.questionId || "N/A")}</dd>
                </div>
                <div>
                    <dt>Question</dt>
                    <dd>${escapeHtml(block.question || "N/A")}</dd>
                </div>
                <div>
                    <dt>Answer Type</dt>
                    <dd>${escapeHtml(block.answerType || "N/A")}</dd>
                </div>
                <div>
                    <dt>Options</dt>
                    <dd>
                        <ol>
                            ${block.options.length
                                ? block.options.map(option => `
                                    <li>${escapeHtml(option.internalValue || option.displayValue || "<no options>")}</li>
                                `).join("")
                                : "<li>&lt;no options&gt;</li>"}
                        </ol>
                    </dd>
                </div>
            </dl>
        </section>
        <hr class="review-output-divider">
    `).join("");
}

function buildNotesMetaHtml(result) {
    return `
        <div class="review-notes-meta-document">
            ${contactsHtml(result.contacts || [])}
            <p><strong>${result.status === "Incomplete" ? "Due On" : "Survey Completed On"}:</strong> ${escapeHtml(result.status === "Incomplete" ? result.dueOnFormatted : result.surveyCompletedOnFormatted)}</p>
            ${result.status === "Incomplete"
                ? `<p><strong>Survey Completed On:</strong> ${escapeHtml(result.surveyCompletedOnFormatted || "N/A")}</p>
                   <p><strong>Incomplete Initiated On:</strong> ${escapeHtml(result.incompleteInitiatedOnFormatted || "N/A")}</p>`
                : `<p><strong>Due On:</strong> ${escapeHtml(result.dueOnFormatted || "N/A")}</p>`}
        </div>
    `;
}

function buildReviewOutputHtml(result) {
    return workQueueHtml(
        result.workQueue || []
    );
}

function buildReviewOutputCopyHtml(result) {
    return workQueueHtml(
        result.workQueue || [],
        {
            includeCheckbox:
                true
        }
    );
}

function buildReviewOutputText(result) {
    const blocks =
        (result.workQueue || [])
            .map(block => [
                `[ ] (${block.status})`,
                `Category : ${block.questionGroup || "N/A"}`,
                `Question ID : ${block.questionId || "N/A"}`,
                `Question : ${block.question}`,
                "",
                `Answer type : ${block.answerType}`,
                "Options :",
                ...(block.options.length
                    ? block.options.map(option =>
                        `${option.index}. ${option.internalValue || option.displayValue || "<no options>"}`
                    )
                    : ["1. <no options>"]),
                "----------------------------------------"
            ].join("\n"))
            .join("\n\n") ||
        "No reachable unanswered work queue items were found.";

    return blocks;
}

function buildReviewOutputRtf(result) {
    const blocks =
        safeArray(result.workQueue);

    if (blocks.length === 0) {
        return "{\\rtf1\\ansi No reachable unanswered work queue items were found.}";
    }

    const checkboxField =
        "{\\field{\\*\\fldinst FORMCHECKBOX}{\\fldrslt }}";

    const body =
        blocks.map(block => {
            const options =
                block.options.length
                    ? block.options.map(option =>
                        `\\tab ${option.index}. ${escapeRtf(option.internalValue || option.displayValue || "<no options>")}\\line `
                    ).join("")
                    : "\\tab 1. <no options>\\line ";

            return [
                `${checkboxField} (${escapeRtf(block.status)})\\line `,
                `\\b Category:\\b0  ${escapeRtf(block.questionGroup || "N/A")}\\line `,
                `\\b Question ID:\\b0  ${escapeRtf(block.questionId || "N/A")}\\line `,
                `\\b Question:\\b0  ${escapeRtf(block.question || "N/A")}\\line `,
                `\\b Answer Type:\\b0  ${escapeRtf(block.answerType || "N/A")}\\line `,
                "\\b Options:\\b0 \\line ",
                options,
                "\\line \\brdrb\\brdrs\\brdrw10\\pard\\line "
            ].join("");
        }).join("");

    return `{\\rtf1\\ansi\\deff0 ${body}}`;
}

function buildNotesHtml(result) {
    return `
        ${buildNotesMetaHtml(result)}
        <h2>Review Output</h2>
        ${buildReviewOutputHtml(result)}
    `;
}

async function loadQuestionsAndDetail(
    assessmentId
) {
    const detail =
        await getAssessmentDetail(assessmentId);

    const surveyTemplateId =
        getDetailSurveyTemplateId(detail);

    const questions =
        await getSurveyQuestions(
            surveyTemplateId
        );

    return {
        detail,
        surveyTemplateId,
        questions:
            questions || []
    };
}

async function buildReviewResult(
    assessment,
    surveyTemplates
) {
    const lastAssessmentId =
        assessment.lastAssessmentId ||
        assessment.raw?.lastAssessmentId;

    if (!lastAssessmentId) {
        throw new Error(
            "No last assessment ID was found."
        );
    }

    const incompleteAssessmentId =
        assessment.incompleteAssessmentId ||
        assessment.raw?.incompleteAssessmentId ||
        null;

    const status =
        incompleteAssessmentId
            ? "Incomplete"
            : "Completed";

    const activeAssessmentId =
        incompleteAssessmentId ||
        lastAssessmentId;

    const [
        oldContext,
        oldAnswersRaw,
        contacts
    ] = await Promise.all([
        loadQuestionsAndDetail(
            lastAssessmentId
        ),
        getAssessmentAnswers(
            lastAssessmentId
        ),
        getAssessmentContacts(
            activeAssessmentId
        ).catch(() => [])
    ]);

    let newContext;
    let newAnswers = [];
    let selectedLatestTemplate = null;

    if (incompleteAssessmentId) {
        const [
            incompleteContext,
            incompleteAnswersRaw
        ] = await Promise.all([
            loadQuestionsAndDetail(
                incompleteAssessmentId
            ),
            getAssessmentAnswers(
                incompleteAssessmentId
            )
        ]);

        newContext =
            incompleteContext;

        newAnswers =
            loadAnswerList(
                incompleteAnswersRaw
            );
    } else {
        selectedLatestTemplate =
            findLatestReleasedTemplate(
                surveyTemplates
            );

        if (!selectedLatestTemplate) {
            throw new Error(
                "No latest released active RP app survey template was found."
            );
        }

        const [
            templateDetail,
            questions
        ] = await Promise.all([
            getSurveyTemplateDetails(
                selectedLatestTemplate.surveyTemplateId
            ),
            getSurveyQuestions(
                selectedLatestTemplate.surveyTemplateId
            )
        ]);

        newContext = {
            detail:
                templateDetail,
            surveyTemplateId:
                selectedLatestTemplate.surveyTemplateId,
            questions:
                questions || []
        };
    }

    const oldAnswers =
        loadAnswerList(
            oldAnswersRaw
        );

    const workQueue =
        buildWorkQueueBlocks(
            oldContext.questions,
            oldAnswers,
            newContext.questions,
            newAnswers
        );

    const reviewContacts =
        filterReviewContacts(
            contacts
        );

    const result = {
        assessmentId:
            activeAssessmentId,
        assetId:
            assessment.assetId,
        assetName:
            assessment.assetName,
        status,
        lastAssessmentId,
        incompleteAssessmentId,
        oldSurveyTemplateId:
            oldContext.surveyTemplateId,
        newSurveyTemplateId:
            newContext.surveyTemplateId,
        oldReferenceTemplate:
            findTemplateById(
                surveyTemplates,
                oldContext.surveyTemplateId
            ),
        newReferenceTemplate:
            findTemplateById(
                surveyTemplates,
                newContext.surveyTemplateId
            ) ||
            selectedLatestTemplate,
        selectedLatestTemplate,
        surveyCompletedOn:
            assessment.surveyCompletedOn ||
            assessment.raw?.surveyCompletedOn ||
            "",
        dueOn:
            assessment.dueOn ||
            assessment.raw?.dueOn ||
            "",
        incompleteInitiatedOn:
            assessment.incompleteInitiatedOn ||
            assessment.raw?.incompleteInitiatedOn ||
            "",
        contacts:
            reviewContacts,
        workQueue,
        reviewedAt:
            Date.now()
    };

    result.surveyCompletedOnFormatted =
        formatDate(result.surveyCompletedOn);

    result.dueOnFormatted =
        formatDate(result.dueOn);

    result.incompleteInitiatedOnFormatted =
        formatDate(result.incompleteInitiatedOn);

    result.notesHtml =
        buildNotesHtml(result);

    result.notesMetaHtml =
        buildNotesMetaHtml(result);

    result.reviewOutputHtml =
        buildReviewOutputHtml(result);

    result.reviewOutputCopyHtml =
        buildReviewOutputCopyHtml(result);

    result.reviewOutputText =
        buildReviewOutputText(result);

    result.reviewOutputRtf =
        buildReviewOutputRtf(result);

    result.notesText =
        result.reviewOutputText;

    return result;
}

async function getCachedSurveyTemplates() {
    if (
        typeof chrome === "undefined" ||
        !chrome.storage?.local
    ) {
        return [];
    }

    const data =
        await chrome.storage.local.get(
            CONFIG.STORAGE_KEYS.WHATS_NEW_MODAL
        );

    const state =
        data[CONFIG.STORAGE_KEYS.WHATS_NEW_MODAL] || {};

    return Array.isArray(state.templates)
        ? state.templates
        : [];
}

async function loadReviewSurveyTemplates() {
    try {
        return await getRiskProfilerSurveyTemplates();
    } catch (error) {
        const cached =
            await getCachedSurveyTemplates();

        if (
            cached.length > 0
        ) {
            return cached;
        }

        return [];
    }
}

export async function reviewBatch(
    assessments,
    progressCallback,
    shouldCancel
) {
    const results = [];
    let completed = 0;

    const surveyTemplates =
        await loadReviewSurveyTemplates();

    for (
        let i = 0;
        i < assessments.length;
        i += MAX_CONCURRENT_REVIEWS
    ) {
        if (
            shouldCancel &&
            shouldCancel()
        ) {
            throw new Error(
                "Review cancelled by user"
            );
        }

        const batch =
            assessments.slice(
                i,
                i + MAX_CONCURRENT_REVIEWS
            );

        const batchResults =
            await Promise.all(
                batch.map(async assessment => {
                    try {
                        const result =
                            await buildReviewResult(
                                assessment,
                                surveyTemplates
                            );

                        completed += 1;

                        progressCallback?.({
                            completed,
                            total:
                                assessments.length,
                            current:
                                assessment.assetName,
                            assessment,
                            result
                        });

                        return result;
                    } catch (error) {
                        completed += 1;

                        const result = {
                            assessmentId:
                                assessment.assessmentId,
                            assetName:
                                assessment.assetName,
                            assessment,
                            status:
                                assessment.incompleteAssessmentId
                                    ? "Incomplete"
                                    : "Completed",
                            error:
                                error.message,
                            reviewedAt:
                                Date.now()
                        };

                        progressCallback?.({
                            completed,
                            total:
                                assessments.length,
                            current:
                                assessment.assetName,
                            assessment,
                            result
                        });

                        return result;
                    }
                })
            );

        results.push(
            ...batchResults
        );
    }

    return results;
}
