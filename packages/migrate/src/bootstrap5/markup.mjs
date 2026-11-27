/*
 * The contents of this file are subject to the terms of the Common Development and
 * Distribution License (the License). You may not use this file except in compliance with the
 * License.
 *
 * You can obtain a copy of the License at legal/CDDLv1.1.txt. See the License for the
 * specific language governing permission and limitations under the License.
 *
 * When distributing Covered Software, include this CDDL Header Notice in each file and include
 * the License file at legal/CDDLv1.1.txt. If applicable, add the following below the CDDL
 * Header, with the fields enclosed by brackets [] replaced by your own identifying
 * information: "Portions copyright [year] [name of copyright owner]".
 *
 * Copyright 2026 Wren Security.
 */
import { migrateAttributes } from "./attributes.mjs";
import { gridGuardReport, isBootstrap3Prefix, migrateClasses } from "./classes.mjs";

/**
 * Scanner of HTML start tags in Handlebars templates (and HTML fragments in scripts).
 *
 * HTML parsers misread Handlebars inside tags (<input {{#if x}}checked{{/if}}>), so the scanner reads start tags
 * and their attributes only, skipping {{…}} expressions wherever they are.
 */

const VOID_ELEMENTS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source",
    "track", "wbr"]);

/** Offset after a Handlebars expression starting at the given offset. */
function mustacheEnd(text, start) {
    if (text.startsWith("{{!--", start)) {
        const end = text.indexOf("--}}", start + 5);
        return end === -1 ? text.length : end + 4;
    }
    const close = text.startsWith("{{{", start) ? "}}}" : "}}";
    const end = text.indexOf(close, start + close.length);
    return end === -1 ? text.length : end + close.length;
}

/** Whether a Handlebars expression produces no output (block helpers, else, comments). */
function isBlockMustache(expression) {
    return /^\{\{~?\s*(?:[#/^!*]|else\b)/.test(expression);
}

/**
 * Split an attribute value into class tokens. Tokens next to an output expression ({{size}}) are partial.
 */
function valueTokens(text, start, end) {
    const tokens = [];
    let current = null;
    let afterOutput = false;
    const close = (partial) => {
        if (current) {
            current.partial ||= partial;
            tokens.push(current);
            current = null;
        }
    };
    for (let index = start; index < end;) {
        if (text.startsWith("{{", index)) {
            const next = mustacheEnd(text, index);
            const output = !isBlockMustache(text.slice(index, next));
            close(output);
            afterOutput = output;
            index = next;
        } else if (/\s/.test(text[index])) {
            close(false);
            afterOutput = false;
            index++;
        } else {
            current ??= { start: index, partial: afterOutput };
            current.end = ++index;
            current.text = text.slice(current.start, current.end);
        }
    }
    close(false);
    return tokens;
}

/** Read a start tag at the given offset (text[offset] === "<"). */
function readStartTag(text, offset) {
    const name = /^<([a-zA-Z][\w:-]*)/.exec(text.slice(offset, offset + 64));
    if (!name) {
        return null;
    }
    const element = { tag: name[1].toLowerCase(), start: offset, attributes: [], selfClosing: false };
    let index = offset + name[0].length;
    while (index < text.length) {
        if (text.startsWith("{{", index)) {
            index = mustacheEnd(text, index);
        } else if (/\s/.test(text[index])) {
            index++;
        } else if (text[index] === ">") {
            element.end = index + 1;
            return element;
        } else if (text.startsWith("/>", index)) {
            element.selfClosing = true;
            element.end = index + 2;
            return element;
        } else {
            const attribute = { nameStart: index };
            while (index < text.length && !/[\s=>]/.test(text[index]) && !text.startsWith("{{", index)
                    && !text.startsWith("/>", index)) {
                index++;
            }
            if (index === attribute.nameStart) {
                index++;
                continue;
            }
            attribute.nameEnd = index;
            attribute.name = text.slice(attribute.nameStart, index);
            attribute.value = null;
            let valueIndex = index;
            while (/\s/.test(text[valueIndex] ?? "")) {
                valueIndex++;
            }
            if (text[valueIndex] === "=") {
                valueIndex++;
                while (/\s/.test(text[valueIndex] ?? "")) {
                    valueIndex++;
                }
                const quote = text[valueIndex] === "\"" || text[valueIndex] === "'" ? text[valueIndex] : null;
                attribute.valueStart = quote ? valueIndex + 1 : valueIndex;
                index = attribute.valueStart;
                while (index < text.length) {
                    if (text.startsWith("{{", index)) {
                        attribute.dynamic = true;
                        index = mustacheEnd(text, index);
                    } else if (quote ? text[index] === quote : /[\s>]/.test(text[index])) {
                        break;
                    } else {
                        index++;
                    }
                }
                attribute.valueEnd = index;
                attribute.value = text.slice(attribute.valueStart, index);
                if (quote) {
                    index++;
                }
            }
            element.attributes.push(attribute);
        }
    }
    return null;
}

/**
 * Scan the start tags of a template.
 *
 * @returns {object[]} elements with their tag, attributes, class tokens and parent element
 */
export function scanMarkup(text) {
    const elements = [];
    const stack = [];
    let index = 0;
    while (index < text.length) {
        if (text.startsWith("{{", index)) {
            index = mustacheEnd(text, index);
        } else if (text.startsWith("<!--", index)) {
            const end = text.indexOf("-->", index + 4);
            index = end === -1 ? text.length : end + 3;
        } else if (text.startsWith("</", index)) {
            const name = /^<\/([a-zA-Z][\w:-]*)/.exec(text.slice(index, index + 64));
            if (name) {
                const position = stack.findLastIndex((element) => element.tag === name[1].toLowerCase());
                if (position !== -1) {
                    stack.length = position;
                }
            }
            index += 2;
        } else if (text[index] === "<") {
            const element = readStartTag(text, index);
            if (!element) {
                index++;
                continue;
            }
            element.parent = stack.at(-1) ?? null;
            const classAttribute = element.attributes.find((attribute) => attribute.name.toLowerCase() === "class");
            element.classTokens = classAttribute?.value != null
                ? valueTokens(text, classAttribute.valueStart, classAttribute.valueEnd) : [];
            element.classes = new Set(element.classTokens.filter((token) => !token.partial).map((token) => token.text));
            elements.push(element);
            index = element.end;
            const type = element.attributes.find((attribute) => attribute.name.toLowerCase() === "type")?.value;
            if ((element.tag === "script" && !/handlebars|template/.test(type ?? "")) || element.tag === "style") {
                const end = text.toLowerCase().indexOf(`</${element.tag}`, index);
                index = end === -1 ? text.length : end;
            } else if (!element.selfClosing && !VOID_ELEMENTS.has(element.tag) && element.tag !== "script") {
                stack.push(element);
            }
        } else {
            index++;
        }
    }
    return elements;
}

/** Classes and data attributes used by scanned elements (the file context). */
export function markupUsage(elements) {
    const classes = new Set();
    const attributes = [];
    for (const element of elements) {
        element.classes.forEach((token) => classes.add(token));
        element.attributes.forEach((attribute) => attributes.push(attribute.name));
    }
    return { classes, attributes };
}

/** Edits removing a token and one adjacent whitespace run, without overlapping previous edits. */
function removeToken(text, token, valueStart, valueEnd, consumed) {
    let start = token.start;
    while (start > valueStart && /[ \t]/.test(text[start - 1])) {
        start--;
    }
    if (start < token.start && start >= consumed.until && start > valueStart) {
        return { start, end: token.end, text: "" };
    }
    let end = token.end;
    while (end < valueEnd && /[ \t]/.test(text[end])) {
        end++;
    }
    consumed.until = end;
    return { start: token.start, end, text: "" };
}

/** Edit removing an attribute with the whitespace before it. */
function removeAttribute(text, attribute) {
    let start = attribute.nameStart;
    while (/[ \t]/.test(text[start - 1])) {
        start--;
    }
    const end = attribute.valueEnd ?? attribute.nameEnd;
    return { start, end: end + (/["']/.test(text[end] ?? "") ? 1 : 0), text: "" };
}

/** Whether an element is an item of a dropdown menu (in a <li> of the menu, or directly in it). */
function isInDropdownMenu(element) {
    const menu = element.parent?.tag === "li" ? element.parent.parent : element.parent;
    return Boolean(menu?.classes.has("dropdown-menu"));
}

/** Whether an element contains only icons (<i> or <span> elements without text), no text and no caret. */
function isIconOnly(text, element) {
    const close = text.indexOf(`</${element.tag}`, element.end);
    if (close === -1) {
        return false;
    }
    const content = text.slice(element.end, close);
    return /<(i|span)\b/.test(content) && !/\bcaret\b/.test(content)
        && !content.replace(/<(i|span)\b[^>]*>\s*<\/\1>/g, "").replace(/\{\{!(--)?[\s\S]*?\}\}/g, "").trim();
}

/** Edit removing a range with the whitespace before it, and with its line if it stands alone. */
function removeRange(text, start, end) {
    let whitespace = start;
    while (whitespace > 0 && /[ \t]/.test(text[whitespace - 1])) {
        whitespace--;
    }
    const lineStart = whitespace === 0 || text[whitespace - 1] === "\n";
    const rest = /^[ \t]*\r?\n/.exec(text.slice(end));
    if (lineStart && rest) {
        return { start: whitespace, end: end + rest[0].length, text: "" };
    }
    // Other content stays on the line: keep its indentation
    return { start: lineStart ? start : whitespace, end, text: "" };
}

/** Indentation of the line of an offset (when only whitespace precedes the offset on its line). */
function indentationAt(text, offset) {
    const lineStart = text.lastIndexOf("\n", offset - 1) + 1;
    const before = text.slice(lineStart, offset);
    return /^[ \t]*$/.test(before) ? before : null;
}

/** Offset after an empty element (its end tag following only whitespace), null when it is not empty. */
function emptyElementEnd(text, element) {
    const close = new RegExp(`^\\s*</${element.tag}\\s*>`, "i").exec(text.slice(element.end));
    return close ? element.end + close[0].length : null;
}

/** Edit removing an empty caret span of a dropdown toggle, with its line if it stands alone. */
function removeCaret(text, element) {
    const end = emptyElementEnd(text, element);
    return end === null ? null : removeRange(text, element.start, end);
}

/**
 * Parts of a titatoggle switch in its usual markup: the element with checkbox-slider classes starts with a <label>
 * without attributes, which holds only a checkbox and an empty <span> (the label text is elsewhere). Content after
 * the label (help text) stays.
 *
 * @returns {?{ label: object, labelClose: number[], input: object, span: ?number[] }} the label with the range of its
 *          end tag, the input and the range of the span (with a Handlebars comment that follows it), null for other
 *          markup
 */
function switchParts(text, wrapper, elements) {
    const label = elements.find((element) => element.parent === wrapper);
    if (label?.tag !== "label" || label.attributes.length || text.slice(wrapper.end, label.start).trim()) {
        return null;
    }
    const inner = elements.filter((element) => element.parent === label);
    const input = inner.find((element) => element.tag === "input");
    const type = input?.attributes.find((attribute) => attribute.name.toLowerCase() === "type")?.value;
    const others = inner.filter((element) => element !== input);
    const span = others[0];
    if (type?.toLowerCase() !== "checkbox" || others.length > 1
            || (span && (span.tag !== "span" || span.attributes.length || emptyElementEnd(text, span) === null))) {
        return null;
    }
    const close = /<\/label\s*>/i.exec(text.slice(input.end));
    if (!close) {
        return null;
    }
    const labelClose = [input.end + close.index, input.end + close.index + close[0].length];
    let spanRange = null;
    if (span) {
        const end = emptyElementEnd(text, span);
        const comment = /^[ \t]*\{\{!(?:--[\s\S]*?--|[^}]*)\}\}/.exec(text.slice(end));
        spanRange = [span.start, end + (comment?.[0].length ?? 0)];
    }
    const rest = text.slice(label.end, labelClose[0]).replace(text.slice(input.start, input.end), "")
        .replace(spanRange ? text.slice(...spanRange) : "", "");
    if (rest.trim()) {
        return null;
    }
    return { label, labelClose, input, span: spanRange };
}

/** Edits converting a titatoggle switch to a Bootstrap 5 switch (the wrapper classes are migrated separately). */
function convertSwitch(text, parts) {
    const { label, labelClose, input, span } = parts;
    const edits = [removeRange(text, label.start, label.end), removeRange(text, ...labelClose)];
    if (span) {
        edits.push(removeRange(text, ...span));
    }
    // The label content moves one level up: dedent its lines by the indentation the input has over the label
    const labelIndent = indentationAt(text, label.start);
    const inputIndent = indentationAt(text, input.start);
    if (labelIndent !== null && inputIndent?.startsWith(labelIndent) && inputIndent.length > labelIndent.length) {
        const step = inputIndent.slice(labelIndent.length);
        for (let lineStart = text.indexOf("\n", label.end) + 1; lineStart > 0 && lineStart < labelClose[0];
            lineStart = text.indexOf("\n", lineStart) + 1) {
            const position = lineStart + labelIndent.length;
            const removed = edits.some((edit) => edit.start <= position && position < edit.end);
            if (!removed && text.startsWith(labelIndent + step, lineStart)) {
                edits.push({ start: position, end: position + step.length, text: "" });
            }
        }
    }
    const inputClass = input.attributes.find((attribute) => attribute.name.toLowerCase() === "class");
    const afterName = input.start + 1 + input.tag.length;
    if (inputClass?.value != null) {
        const separator = inputClass.value.trim() ? " " : "";
        edits.push({ start: inputClass.valueStart, end: inputClass.valueStart, text: `form-check-input${separator}` });
    } else {
        edits.push({ start: afterName, end: afterName, text: " class=\"form-check-input\"" });
    }
    if (!input.attributes.some((attribute) => attribute.name.toLowerCase() === "role")) {
        edits.push({ start: afterName, end: afterName, text: " role=\"switch\"" });
    }
    return edits;
}

/**
 * Migrate the markup of scanned elements.
 *
 * @returns {{ edits: object[], reports: object[] }} edits and reports with offsets in the scanned text
 */
export function migrateMarkup(text, elements, file) {
    const edits = [];
    const reports = [];
    const movedStates = new Set();
    for (const element of elements) {
        const tokens = element.classTokens.filter((token) => !token.partial);
        const partial = element.classTokens.filter((token) => token.partial);
        for (const token of partial) {
            if (isBootstrap3Prefix(token.text) || /^(col-(xs|sm|md|lg)|label|btn|panel)-?$/.test(token.text)) {
                reports.push({ offset: token.start, rule: "dynamic-class", text: token.text,
                    message: "class completed by an expression, rename the Bootstrap 3 class by hand" });
            }
        }

        if (tokens.length === 1 && tokens[0].text === "caret" && element.tag === "span"
                && element.parent?.classes.has("dropdown-toggle")) {
            const edit = removeCaret(text, element);
            if (edit) {
                edits.push(edit);
                continue;
            }
        }

        const classMigration = migrateClasses(tokens.map((token) => token.text), {
            file,
            tag: element.tag,
            mode: "markup",
            parent: element.parent?.classes,
            context: partial.map((token) => token.text)
        });
        const { result } = classMigration;
        let classReports = classMigration.reports;

        // titatoggle switches in their usual markup become Bootstrap 5 switches
        const titatoggle = (token) => token === "checkbox" || /^checkbox-slider/.test(token);
        const switchMarkup = tokens.some((token) => /^checkbox-slider/.test(token.text))
            ? switchParts(text, element, elements) : null;
        if (switchMarkup) {
            const replaced = tokens.findIndex((token) => titatoggle(token.text));
            tokens.forEach((token, index) => {
                if (titatoggle(token.text)) {
                    result[index] = index === replaced
                        ? ["form-check", "form-switch"].filter((name) => !element.classes.has(name)) : [];
                }
            });
            classReports = classReports.filter((report) => !titatoggle(tokens[report.index].text));
            edits.push(...convertSwitch(text, switchMarkup));
        } else if (classReports.some((report) => report.rule === "switch")) {
            // One report per switch that is not converted
            const first = classReports.find((report) => report.rule === "switch");
            classReports = classReports.filter((report) => !titatoggle(tokens[report.index].text) || report === first);
        }
        const classAttribute = element.attributes.find((attribute) => attribute.name.toLowerCase() === "class");
        const consumed = { until: 0 };
        let attributeRemoved = false;
        if (tokens.length && result.every((renamed) => renamed && !renamed.length) && !classAttribute.dynamic) {
            edits.push(removeAttribute(text, classAttribute));
            attributeRemoved = true;
            result.fill(null);
        }

        // Items of dropdown menus are dropdown-item links or buttons, with the active and disabled states
        const menuItem = ["a", "button"].includes(element.tag) && !element.classes.has("dropdown-item")
            && !element.classes.has("dropdown-toggle") && isInDropdownMenu(element);
        if (menuItem) {
            const item = element.parent.tag === "li" ? element.parent : null;
            const states = item && !movedStates.has(item)
                ? item.classTokens.filter((token) => !token.partial && ["active", "disabled"].includes(token.text)) : [];
            movedStates.add(item);
            // States set by Handlebars expressions can't be moved safely
            const dynamic = states.length > 0
                && item.attributes.find((attribute) => attribute.name.toLowerCase() === "class").dynamic;
            const moved = dynamic ? [] : states;
            for (const token of dynamic ? states : []) {
                reports.push({ offset: token.start, rule: "dropdown-item-state", text: token.text,
                    message: `move ${token.text} from the <li> to its dropdown-item (Bootstrap 5 styles the item)` });
            }
            const added = ["dropdown-item", ...moved.map((token) => token.text).filter((name) => !element.classes.has(name))];
            if (classAttribute?.value != null && !attributeRemoved) {
                const separator = classAttribute.value.trim() ? " " : "";
                edits.push({ start: classAttribute.valueStart, end: classAttribute.valueStart, text: added.join(" ") + separator });
            } else {
                const position = element.start + 1 + element.tag.length;
                edits.push({ start: position, end: position, text: ` class="${added.join(" ")}"` });
            }
            const itemClass = item?.attributes.find((attribute) => attribute.name.toLowerCase() === "class");
            if (moved.length && moved.length === item.classTokens.length && !itemClass.dynamic) {
                edits.push(removeAttribute(text, itemClass));
            } else {
                const itemConsumed = { until: 0 };
                moved.forEach((token) => edits.push(removeToken(text, token, itemClass.valueStart, itemClass.valueEnd,
                    itemConsumed)));
            }
        }

        if (element.classes.has("dropdown-toggle") && isIconOnly(text, element)) {
            const token = tokens.find((item) => item.text === "dropdown-toggle");
            reports.push({ offset: token.start, rule: "dropdown-caret", text: token.text,
                message: "Bootstrap 5 adds a caret to dropdown toggles, remove dropdown-toggle (and update styles that "
                    + "use it) if this icon toggle should have none" });
        }
        result.forEach((renamed, index) => {
            const token = tokens[index];
            if (renamed?.length) {
                edits.push({ start: token.start, end: token.end, text: renamed.join(" ") });
            } else if (renamed) {
                edits.push(removeToken(text, token, classAttribute.valueStart, classAttribute.valueEnd, consumed));
            }
        });
        const guard = gridGuardReport(tokens.map((token) => token.text), file);
        for (const report of guard ? [...classReports, guard] : classReports) {
            reports.push({ offset: tokens[report.index].start, rule: report.rule, text: tokens[report.index].text,
                message: report.message });
        }

        const attributes = element.attributes.filter((attribute) => /^(data-|rel$)/i.test(attribute.name));
        const migrated = migrateAttributes(attributes.map((attribute) => ({
            name: attribute.name,
            value: attribute.value,
            dynamic: attribute.dynamic
        })));
        migrated.result.forEach((name, index) => {
            if (name) {
                edits.push({ start: attributes[index].nameStart, end: attributes[index].nameEnd, text: name });
            }
        });
        for (const report of migrated.reports) {
            const attribute = attributes[report.index];
            reports.push({ offset: attribute.nameStart, rule: report.rule, message: report.message,
                text: text.slice(attribute.nameStart, attribute.valueEnd ?? attribute.nameEnd) });
        }
    }
    return { edits, reports };
}
