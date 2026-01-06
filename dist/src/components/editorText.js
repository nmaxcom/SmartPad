"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSmartPadText = void 0;
const getSmartPadText = (editor) => {
    if (!editor)
        return "";
    const lines = [];
    const { doc } = editor.state;
    doc.forEach((node) => {
        if (!node.isTextblock)
            return;
        lines.push(getTextWithoutResults(node));
    });
    return lines.join("\n");
};
exports.getSmartPadText = getSmartPadText;
const getTextWithoutResults = (node) => {
    let text = "";
    node.descendants((child) => {
        if (child.type.name === "resultToken") {
            return false;
        }
        if (child.isText) {
            text += child.text;
        }
        return undefined;
    });
    return text;
};
