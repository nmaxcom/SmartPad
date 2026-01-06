"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResultsDecoratorExtension = void 0;
const core_1 = require("@tiptap/core");
const prosemirror_state_1 = require("prosemirror-state");
const prosemirror_view_1 = require("prosemirror-view");
const variableParser_1 = require("../parsing/variableParser");
/**
 * ResultsDecoratorExtension
 * Listens for `evaluationDone` events dispatched by the Editor AST pipeline and
 * converts RenderNodes into result/error widget decorations.
 */
exports.ResultsDecoratorExtension = core_1.Extension.create({
    name: "resultsDecoratorExtension",
    addProseMirrorPlugins() {
        const pluginKey = new prosemirror_state_1.PluginKey("results-decorator");
        return [
            new prosemirror_state_1.Plugin({
                key: pluginKey,
                state: {
                    init() {
                        return prosemirror_view_1.DecorationSet.empty;
                    },
                    apply(tr, oldSet) {
                        // Preserve existing decorations unless we receive new ones via meta
                        const newDecos = tr.getMeta(pluginKey);
                        if (newDecos) {
                            return newDecos;
                        }
                        // Map decorations through document changes
                        return oldSet.map(tr.mapping, tr.doc);
                    },
                },
                props: {
                    decorations(state) {
                        return pluginKey.getState(state);
                    },
                },
                view(view) {
                    const normalize = (s) => (s || "").replace(/\s+/g, "").trim();
                    const getNodeTextWithoutResults = (node) => {
                        let text = "";
                        node.descendants((child) => {
                            if (child.type?.name === "resultToken") {
                                return false;
                            }
                            if (child.isText) {
                                text += child.text;
                            }
                            return undefined;
                        });
                        return text;
                    };
                    const parseNumberParts = (value) => {
                        const trimmed = value.trim();
                        const match = trimmed.match(/^([^0-9+-]*)([-+]?[0-9.,]*\\.?[0-9]+(?:[eE][+-]?\\d+)?)(.*)$/);
                        if (!match)
                            return null;
                        const rawNumber = match[2].replace(/,/g, "");
                        const numberValue = Number(rawNumber);
                        if (!Number.isFinite(numberValue))
                            return null;
                        return {
                            prefix: match[1],
                            numberValue,
                            suffix: match[3],
                            rawNumber,
                        };
                    };
                    const countDecimals = (rawNumber) => {
                        const mantissa = rawNumber.split(/e/i)[0];
                        const parts = mantissa.split(".");
                        if (parts.length < 2)
                            return 0;
                        return parts[1].length;
                    };
                    const computeDelta = (prevValue, nextValue) => {
                        const prev = parseNumberParts(prevValue);
                        const next = parseNumberParts(nextValue);
                        if (!prev || !next)
                            return null;
                        if (prev.prefix !== next.prefix || prev.suffix !== next.suffix)
                            return null;
                        const delta = next.numberValue - prev.numberValue;
                        if (!Number.isFinite(delta) || delta === 0)
                            return null;
                        const decimals = Math.min(6, Math.max(countDecimals(prev.rawNumber), countDecimals(next.rawNumber)));
                        const abs = Math.abs(delta);
                        const formatted = decimals > 0 ? abs.toFixed(decimals) : Math.round(abs).toString();
                        const sign = delta >= 0 ? "+" : "-";
                        return `${sign}${next.prefix}${formatted}${next.suffix}`;
                    };
                    const resultHistory = new Map();
                    // Only eligible node types should create widgets
                    const isWidgetEligible = (rn) => rn && (rn.type === "mathResult" || rn.type === "combined" || rn.type === "error");
                    // Helper to rebuild decorations from render nodes
                    const buildDecorations = (doc, renderNodes) => {
                        const decorations = [];
                        // Build a map from line number to render node for quick lookup
                        const renderMap = new Map();
                        renderNodes.forEach((rn) => {
                            renderMap.set(rn.line, rn);
                        });
                        // Derive positions by scanning paragraphs for assignment errors (no =>)
                        if (renderNodes.length > 0) {
                            // Build paragraph index: 1-based line numbers
                            const paragraphIndex = [
                            /*1-based*/
                            ];
                            let line = 0;
                            doc.forEach((node, offset) => {
                                if (!node.isTextblock)
                                    return;
                                line += 1;
                                const start = offset + 1;
                                const text = getNodeTextWithoutResults(node);
                                paragraphIndex[line] = { start, text };
                            });
                            for (let i = 1; i < paragraphIndex.length; i++) {
                                const info = paragraphIndex[i];
                                if (!info)
                                    continue;
                                if (info.text.includes("=>"))
                                    continue;
                                const assignment = (0, variableParser_1.parseVariableAssignment)(info.text);
                                if (!assignment.isValid || !assignment.rawValue)
                                    continue;
                                const renderNode = renderMap.get(i);
                                const isError = renderNode?.type === "error";
                                if (!isError)
                                    continue;
                                let resultText = assignment.rawValue.trim();
                                if (renderNode) {
                                    const rn = renderNode;
                                    if (rn.type === "error" && rn.displayText) {
                                        const displayText = String(rn.displayText || "");
                                        if (displayText.includes("=>")) {
                                            resultText = displayText.replace(/^.*=>\s*/, "");
                                        }
                                        else if (displayText.includes("⚠️")) {
                                            resultText = displayText.substring(displayText.indexOf("⚠️")).trim();
                                        }
                                        else {
                                            resultText = displayText.trim();
                                        }
                                    }
                                }
                                const anchor = info.start + info.text.length;
                                const widget = prosemirror_view_1.Decoration.widget(anchor, () => {
                                    const wrapper = document.createElement("span");
                                    wrapper.className = "semantic-wrapper";
                                    const container = document.createElement("span");
                                    container.className = "semantic-result-container";
                                    const span = document.createElement("span");
                                    span.className = "semantic-error-result";
                                    span.setAttribute("data-result", resultText);
                                    span.setAttribute("title", resultText);
                                    span.setAttribute("aria-label", resultText);
                                    span.textContent = resultText;
                                    container.appendChild(span);
                                    wrapper.appendChild(container);
                                    return wrapper;
                                }, { side: 1 });
                                decorations.push(widget);
                            }
                        }
                        return prosemirror_view_1.DecorationSet.create(doc, decorations);
                    };
                    // Global event listener
                    const listener = (e) => {
                        const custom = e;
                        const renderNodes = custom.detail?.renderNodes ?? [];
                        const resultNodeType = view.state.schema.nodes.resultToken;
                        const tr = view.state.tr;
                        let changed = false;
                        // Build paragraph index for matching results (1-based line numbers)
                        const paragraphIndex = [
                        /*1-based*/
                        ];
                        let line = 0;
                        view.state.doc.forEach((node, offset) => {
                            if (!node.isTextblock)
                                return;
                            line += 1;
                            const start = offset + 1;
                            const text = getNodeTextWithoutResults(node);
                            paragraphIndex[line] = { start, text, node };
                        });
                        const eligibleNodes = renderNodes.filter((rn) => isWidgetEligible(rn));
                        const eligibleNodesByLine = new Map();
                        eligibleNodes.forEach((rn) => {
                            const list = eligibleNodesByLine.get(rn.line) || [];
                            list.push(rn);
                            eligibleNodesByLine.set(rn.line, list);
                        });
                        // Update inline result nodes from bottom to top so positions stay valid
                        for (let i = paragraphIndex.length - 1; i >= 1; i--) {
                            const info = paragraphIndex[i];
                            if (!info)
                                continue;
                            const trimmedText = info.text.trim();
                            if (trimmedText.startsWith("#")) {
                                if (!resultNodeType) {
                                    continue;
                                }
                                const removals = [];
                                info.node.nodesBetween(0, info.node.content.size, (node, pos) => {
                                    if (node.type === resultNodeType) {
                                        const from = info.start + pos;
                                        removals.push({ from, to: from + node.nodeSize });
                                        return false;
                                    }
                                    return undefined;
                                });
                                for (let r = removals.length - 1; r >= 0; r--) {
                                    tr.delete(removals[r].from, removals[r].to);
                                    changed = true;
                                }
                                continue;
                            }
                            const arrowIdx = info.text.indexOf("=>");
                            if (arrowIdx < 0) {
                                if (!resultNodeType) {
                                    continue;
                                }
                                const removals = [];
                                info.node.nodesBetween(0, info.node.content.size, (node, pos) => {
                                    if (node.type === resultNodeType) {
                                        const from = info.start + pos;
                                        removals.push({ from, to: from + node.nodeSize });
                                        return false;
                                    }
                                    return undefined;
                                });
                                for (let r = removals.length - 1; r >= 0; r--) {
                                    tr.delete(removals[r].from, removals[r].to);
                                    changed = true;
                                }
                                continue;
                            }
                            if (!resultNodeType) {
                                continue;
                            }
                            const exprText = info.text.substring(0, arrowIdx).trim();
                            const historyKey = `${i}:${normalize(exprText)}`;
                            // Find best matching eligible render node by comparing left-of-arrow text
                            let matched = null;
                            const matchByExpression = (candidates) => {
                                for (const rn of candidates) {
                                    const displayText = String(rn.displayText || "");
                                    if (displayText.includes("=>")) {
                                        const leftOfArrow = displayText.split("=>")[0].trim();
                                        if (normalize(leftOfArrow) === normalize(exprText)) {
                                            return rn;
                                        }
                                    }
                                    if (rn.originalRaw) {
                                        const orig = String(rn.originalRaw)
                                            .replace(/\s*=>\s*$/, "")
                                            .trim();
                                        if (normalize(orig) === normalize(exprText)) {
                                            return rn;
                                        }
                                    }
                                }
                                return null;
                            };
                            const lineCandidates = eligibleNodesByLine.get(i) || [];
                            matched = matchByExpression(lineCandidates);
                            if (!matched) {
                                matched = matchByExpression(eligibleNodes);
                            }
                            const afterArrowPos = info.start + arrowIdx + 2;
                            const lineEndPos = info.start + info.node.content.size;
                            const slice = tr.doc.slice(afterArrowPos, lineEndPos).content;
                            if (!matched) {
                                if (slice.childCount > 0) {
                                    tr.delete(afterArrowPos, lineEndPos);
                                    changed = true;
                                }
                                continue;
                            }
                            const displayText = String(matched.displayText || "");
                            let resultText = "";
                            if (displayText.includes("=>")) {
                                resultText = displayText.replace(/^.*=>\s*/, "");
                            }
                            else if (displayText.includes("⚠️")) {
                                resultText = displayText.substring(displayText.indexOf("⚠️")).trim();
                            }
                            else {
                                resultText = displayText;
                            }
                            const isError = matched.type === "error";
                            const normalizedResult = resultText.trim();
                            const previousValue = resultHistory.get(historyKey);
                            const hasChanged = previousValue !== undefined && previousValue !== normalizedResult && !isError;
                            const deltaValue = hasChanged
                                ? computeDelta(previousValue, normalizedResult) || "updated"
                                : "";
                            const flashValue = hasChanged;
                            const existingResult = slice.childCount === 1 ? slice.child(0) : null;
                            const existingText = existingResult ? existingResult.textContent || "" : "";
                            const hasExpected = !!existingResult &&
                                existingResult.type === resultNodeType &&
                                existingText === normalizedResult &&
                                !!existingResult.attrs.isError === isError;
                            if (!hasExpected) {
                                tr.delete(afterArrowPos, lineEndPos);
                                const content = normalizedResult
                                    ? view.state.schema.text(normalizedResult)
                                    : undefined;
                                tr.insert(afterArrowPos, resultNodeType.create({ value: normalizedResult, isError, flash: flashValue, delta: deltaValue }, content));
                                changed = true;
                            }
                            if (!isError) {
                                resultHistory.set(historyKey, normalizedResult);
                            }
                        }
                        const decoSet = buildDecorations(tr.doc, renderNodes);
                        const finalSet = decoSet;
                        const currentSet = pluginKey.getState(view.state);
                        const decoChanged = currentSet
                            ? !currentSet.eq?.(finalSet)
                            : true;
                        if (decoChanged) {
                            tr.setMeta(pluginKey, finalSet);
                        }
                        if (changed || decoChanged) {
                            tr.setMeta("addToHistory", false);
                            view.dispatch(tr);
                        }
                        // Dispatch uiRenderComplete event AFTER decorations are applied and update a global sequence flag
                        // This makes the pipeline end deterministic for tests
                        try {
                            const decorationCount = finalSet.find ? finalSet.find().length : 0;
                            const sequence = custom.detail?.sequence ?? (window.__evaluationSeq || 0);
                            try {
                                window.__uiRenderSeq = sequence;
                            }
                            catch { }
                            window.dispatchEvent(new CustomEvent("uiRenderComplete", {
                                detail: {
                                    renderNodes: renderNodes,
                                    decorationCount,
                                    sequence,
                                },
                            }));
                        }
                        catch (e) {
                            console.warn("Failed to dispatch uiRenderComplete event", e);
                        }
                    };
                    window.addEventListener("evaluationDone", listener);
                    return {
                        destroy() {
                            window.removeEventListener("evaluationDone", listener);
                        },
                    };
                },
            }),
        ];
    },
});
