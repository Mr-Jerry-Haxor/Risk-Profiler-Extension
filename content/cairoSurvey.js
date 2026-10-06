(() => {
    const BUTTONS_ID = "risk-profiler-cairo-actions";
    let checkedUrl = "";
    let eligible = false;
    let checking = false;
    let modal = null;
    let trigger = null;
    let scheduled = false;
    let headerLayout = null;

    function restoreHeaderLayout() {
        if (!headerLayout) return;
        for (const { element, width, priority } of headerLayout.columns) {
            if (width) element.style.setProperty("width", width, priority);
            else element.style.removeProperty("width");
        }
        headerLayout = null;
    }

    function widenSurveyActions(outline) {
        if (headerLayout?.actions.contains(outline)) return;
        restoreHeaderLayout();
        for (let actions = outline.parentElement; actions?.parentElement; actions = actions.parentElement) {
            if (actions.tagName.toLowerCase() !== "div") continue;
            const title = [...actions.parentElement.children].find(element => {
                if (element === actions || element.tagName.toLowerCase() !== "div") return false;
                if (actions.style.width === "40%" && element.style.width === "60%") return true;
                // Also recognize stylesheet-defined widths, which compute to pixels.
                const actionsWidth = parseFloat(getComputedStyle(actions).width);
                const titleWidth = parseFloat(getComputedStyle(element).width);
                return actionsWidth > 0 && titleWidth > 0 &&
                    Math.abs(actionsWidth / (actionsWidth + titleWidth) - 0.4) < 0.01;
            });
            if (!title) continue;
            headerLayout = {
                actions,
                columns: [actions, title].map(element => ({
                    element,
                    width: element.style.getPropertyValue("width"),
                    priority: element.style.getPropertyPriority("width")
                }))
            };
            actions.style.setProperty("width", "60%", "important");
            title.style.setProperty("width", "40%", "important");
            return;
        }
    }

    function closeModal() {
        modal?.remove();
        modal = null;
        trigger?.focus();
    }

    async function openResults(mode, button) {
        if (modal) return;
        trigger = button;
        const pageUrl = location.href;
        // Build immediately, so API/login recovery remains visible to the user.
        modal = document.createElement("dialog");
        modal.setAttribute("aria-label", mode === "review" ? "Risk Profiler Review" : "Risk Profiler Validation");
        modal.style.cssText = "width: min(1200px, 94vw);height:90vh;max-width:94vw;max-height:94vh;padding:0;border:1px solid #ccd4e0;border-radius:12px;background:#f6f8fc;box-shadow:0 20px 80px #0005;";
        const toolbar = document.createElement("div");
        toolbar.style.cssText = "display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:white;border-bottom:1px solid #ddd;font:600 16px Segoe UI,sans-serif;";
        const title = document.createElement("span");
        title.textContent = mode === "review" ? "Plugin - Review" : "Plugin - Validate";
        const close = document.createElement("button");
        close.type = "button";
        close.textContent = "Close";
        close.title = "Close this view. Background processing will continue.";
        close.addEventListener("click", closeModal);
        toolbar.append(title, close);
        const status = document.createElement("p");
        status.style.cssText = "padding:16px;font:14px Segoe UI,sans-serif;";
        status.setAttribute("role", "status");
        status.textContent = "Preparing assessment… You may need to sign in to Cairo, ESATS, or GTC in the tabs opened by the plugin.";
        modal.append(toolbar, status);
        document.body.append(modal);
        modal.addEventListener("cancel", event => { event.preventDefault(); closeModal(); });
        modal.showModal();
        const currentModal = modal;
        let replaceButton = null;
        async function startRequested(replaceExisting = false) {
            if (modal !== currentModal || location.href !== pageUrl) return;
            if (replaceButton) replaceButton.disabled = true;
            if (replaceExisting) status.textContent = "Cancelling the previous job and clearing its generated data… Starting the current app next.";
            try {
                const response = await chrome.runtime.sendMessage({ action: "START_CAIRO_JOB", mode, replaceExisting });
                if (modal !== currentModal || location.href !== pageUrl) return;
                if (!response?.success) {
                    status.textContent = response?.error || "Unable to start the assessment.";
                    if (response?.code === "JOB_RUNNING" && !replaceButton) {
                        replaceButton = document.createElement("button");
                        replaceButton.type = "button";
                        replaceButton.className = button.className;
                        replaceButton.textContent = "Cancel and start current app";
                        replaceButton.title = "Cancel the running job, discard its generated results and cached data, and run this app. Saved settings and ASA notes are preserved.";
                        replaceButton.style.cssText = "margin:0 16px 16px;";
                        replaceButton.addEventListener("click", () => startRequested(true));
                        currentModal.append(replaceButton);
                    }
                    return;
                }
                replaceButton?.remove();
                const frame = document.createElement("iframe");
                frame.title = title.textContent + " results";
                frame.style.cssText = "display:block;width:100%;height:calc(100% - 56px);border:0;";
                frame.allow = "clipboard-write";
                frame.src = chrome.runtime.getURL(`popup.html?view=cairo&job=${encodeURIComponent(response.jobId)}`);
                status.replaceWith(frame);
            } catch (error) {
                status.textContent = error.message || "The extension is unavailable. Reload the Cairo page after reloading the extension.";
            } finally {
                if (replaceButton) replaceButton.disabled = false;
            }
        }
        await startRequested();
    }

    function injectButtons() {
        if (!eligible || checkedUrl !== location.href) return;
        const outline = [...document.querySelectorAll("button, a, input[type=button], input[type=submit]")].find(element =>
            (element.textContent || element.value || "").replace(/\s+/g, " ").trim() === "View Survey Outline"
        );
        if (!outline?.parentElement) return;
        widenSurveyActions(outline);
        let actions = document.getElementById(BUTTONS_ID);
        if (actions?.nextSibling === outline) return;
        if (!actions) {
            actions = document.createElement("span");
            actions.id = BUTTONS_ID;
            actions.style.cssText = "display:inline-flex;gap:6px;margin-right:6px;align-items:center;";
            for (const [mode, label] of [["validation", "Plugin - Validate"], ["review", "Plugin - Review"]]) {
                const button = document.createElement("button");
                button.type = "button";
                button.className = outline.className;
                button.textContent = label;
                button.addEventListener("click", event => { event.preventDefault(); openResults(mode, button); });
                actions.append(button);
            }
        }
        outline.before(actions);
    }

    async function reconcile() {
        scheduled = false;
        if (checkedUrl !== location.href) {
            eligible = false;
            document.getElementById(BUTTONS_ID)?.remove();
            restoreHeaderLayout();
            closeModal();
        }
        if (!/^\/Assessments\/[1-9]\d*\/Survey\/[1-9]\d*\/?$/.test(location.pathname)) {
            checkedUrl = location.href;
            return;
        }
        if (checking) return;
        if (checkedUrl === location.href && eligible) return injectButtons();
        checking = true;
        const url = location.href;
        try {
            const response = await chrome.runtime.sendMessage({ action: "CAIRO_SURVEY_ELIGIBILITY" });
            if (url === location.href) {
                checkedUrl = url;
                eligible = response?.success && response.eligible;
                injectButtons();
            }
        } catch {
            // Fail closed; retry after login or an extension restart.
        } finally {
            checking = false;
        }
    }

    const observer = new MutationObserver(() => {
        if (scheduled) return;
        scheduled = true;
        setTimeout(reconcile, 200);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    // Also covers SPA history changes with no DOM mutations and login completion.
    setInterval(reconcile, 3000);
    reconcile();
})();
