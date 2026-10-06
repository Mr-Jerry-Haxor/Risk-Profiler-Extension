const CAIRO_ORIGIN = "https://cairois.web.boeing.com";

export function parseCairoSurveyUrl(value) {
    try {
        const url = new URL(value);
        const match = /^\/Assessments\/([1-9]\d*)\/Survey\/([1-9]\d*)\/?$/.exec(url.pathname);
        if (url.origin !== CAIRO_ORIGIN || !match) return null;
        return { assessmentId: match[1], surveyTemplateId: match[2] };
    } catch {
        return null;
    }
}

export function isSupportedCairoSurvey(route, templates) {
    return Boolean(route && Array.isArray(templates) && templates.some(template =>
        String(template.surveyTemplateId) === route.surveyTemplateId
    ));
}

export function resolveCairoAssessment(route, assessments, detail) {
    const assessment = assessments.find(item =>
        String(item.incompleteAssessmentId) === route.assessmentId
    );
    if (!assessment) throw new Error("This incomplete assessment was not found in the primary assessment list. Refresh Cairo and try again.");
    if (String(detail?.surveyTemplateId) !== route.surveyTemplateId) {
        throw new Error("The survey template does not match the assessment. Refresh Cairo and try again.");
    }
    return { ...assessment, assessmentId: assessment.incompleteAssessmentId, surveyTemplateId: detail.surveyTemplateId };
}
