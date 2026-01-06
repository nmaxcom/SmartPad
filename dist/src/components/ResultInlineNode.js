"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResultInlineNode = void 0;
const core_1 = require("@tiptap/core");
exports.ResultInlineNode = core_1.Node.create({
    name: "resultToken",
    inline: true,
    group: "inline",
    content: "text*",
    selectable: false,
    draggable: false,
    addAttributes() {
        return {
            value: {
                default: "",
            },
            isError: {
                default: false,
            },
            flash: {
                default: false,
            },
            delta: {
                default: "",
            },
        };
    },
    renderText({ node }) {
        return node.textContent || node.attrs.value || "";
    },
    renderHTML({ node }) {
        const value = node.textContent || node.attrs.value || "";
        const isError = !!node.attrs.isError;
        const flash = !!node.attrs.flash;
        const delta = node.attrs.delta || "";
        const resultClass = isError ? "semantic-error-result" : "semantic-result-display";
        const resultClasses = [resultClass];
        if (!isError && flash) {
            resultClasses.push("semantic-result-flash");
        }
        const contentNode = [
            "span",
            {
                class: resultClasses.join(" "),
                "data-result": value,
                title: value,
                "aria-label": value,
            },
            0,
        ];
        const deltaNode = !isError && delta
            ? [
                "span",
                {
                    class: "semantic-result-delta",
                    "data-delta": delta,
                    "aria-hidden": "true",
                },
                delta,
            ]
            : null;
        return [
            "span",
            {
                class: "semantic-wrapper",
                "data-result-node": "true",
            },
            [
                "span",
                { class: "semantic-result-container" },
                contentNode,
                ...(deltaNode ? [deltaNode] : []),
            ],
        ];
    },
});
