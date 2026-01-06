"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResultInteractionExtension = void 0;
const core_1 = require("@tiptap/core");
const state_1 = require("@tiptap/pm/state");
const isResultNode = (node) => node?.type?.name === "resultToken";
const getResultRangeAtPos = (state, $pos) => {
    if (isResultNode($pos.parent)) {
        const depth = $pos.depth;
        return { from: $pos.before(depth), to: $pos.after(depth) };
    }
    if ($pos.nodeAfter && isResultNode($pos.nodeAfter)) {
        return { from: $pos.pos, to: $pos.pos + $pos.nodeAfter.nodeSize };
    }
    if ($pos.nodeBefore && isResultNode($pos.nodeBefore)) {
        return { from: $pos.pos - $pos.nodeBefore.nodeSize, to: $pos.pos };
    }
    return null;
};
const getResultRangeInside = (state, $pos) => {
    if (!isResultNode($pos.parent))
        return null;
    const depth = $pos.depth;
    return { from: $pos.before(depth), to: $pos.after(depth) };
};
const getResultRangeInSelection = (state, selection) => {
    if (selection.empty) {
        return getResultRangeAtPos(state, selection.$from);
    }
    let range = null;
    state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
        if (isResultNode(node)) {
            range = { from: pos, to: pos + node.nodeSize };
            return false;
        }
        return undefined;
    });
    return range;
};
const getTriggerEndPos = (state, range) => {
    const end = range.from;
    if (end < 2)
        return null;
    const trigger = state.doc.textBetween(end - 2, end, "", "");
    if (trigger === "=>")
        return end;
    return null;
};
exports.ResultInteractionExtension = core_1.Extension.create({
    name: "resultInteractionExtension",
    priority: 1000,
    addKeyboardShortcuts() {
        return {
            Backspace: () => {
                const { state, view } = this.editor;
                const { selection } = state;
                const range = getResultRangeInSelection(state, selection);
                if (!range)
                    return false;
                if (!selection.empty) {
                    const tr = state.tr.delete(selection.from, selection.to);
                    const anchor = Math.min(Math.max(selection.from, 0), tr.doc.content.size);
                    const resolved = tr.doc.resolve(anchor);
                    tr.setSelection(state_1.Selection.near(resolved, -1));
                    view.dispatch(tr);
                    return true;
                }
                const triggerEnd = getTriggerEndPos(state, range);
                if (!triggerEnd) {
                    return true;
                }
                if (triggerEnd - 1 < 0 || triggerEnd > state.doc.content.size) {
                    return true;
                }
                const tr = state.tr.delete(triggerEnd - 1, triggerEnd);
                tr.setSelection(state_1.TextSelection.create(tr.doc, triggerEnd - 1));
                view.dispatch(tr);
                return true;
            },
            Delete: () => {
                const { state } = this.editor;
                const { selection } = state;
                const range = getResultRangeInSelection(state, selection);
                if (!range)
                    return false;
                if (!selection.empty)
                    return true;
                return true;
            },
            Enter: () => {
                const { state, view } = this.editor;
                const { selection } = state;
                const range = getResultRangeInSelection(state, selection);
                if (!range)
                    return false;
                const tr = state.tr.setSelection(state_1.TextSelection.create(state.doc, range.to));
                view.dispatch(tr);
                return false;
            },
        };
    },
    addProseMirrorPlugins() {
        return [
            new state_1.Plugin({
                props: {
                    handleTextInput: (view, from, to, text) => {
                        const { state } = view;
                        if (from !== to) {
                            let hasResult = false;
                            state.doc.nodesBetween(from, to, (node) => {
                                if (isResultNode(node)) {
                                    hasResult = true;
                                    return false;
                                }
                                return undefined;
                            });
                            return hasResult;
                        }
                        const range = getResultRangeInside(state, state.doc.resolve(from));
                        if (!range)
                            return false;
                        const insertPos = range.to;
                        const tr = state.tr.insertText(text, insertPos, insertPos);
                        tr.setSelection(state_1.TextSelection.create(tr.doc, insertPos + text.length));
                        view.dispatch(tr);
                        return true;
                    },
                },
            }),
        ];
    },
});
