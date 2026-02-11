import { Node } from "@tiptap/core";

export const ReferenceInlineNode = Node.create({
  name: "referenceToken",

  inline: true,
  group: "inline",
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      sourceLineId: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-source-line-id") || "",
      },
      sourceLine: {
        default: 0,
        parseHTML: (element) => Number(element.getAttribute("data-source-line") || 0),
      },
      placeholderKey: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-placeholder-key") || "",
      },
      label: {
        default: "value",
        parseHTML: (element) => element.textContent || element.getAttribute("aria-label") || "value",
      },
      sourceValue: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-source-value") || "",
      },
      flash: {
        default: false,
        parseHTML: (element) => element.getAttribute("data-flash") === "true",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-reference-token="true"]',
      },
    ];
  },

  renderText({ node }) {
    return String(node.attrs.label || "value");
  },

  renderHTML({ node }) {
    const label = String(node.attrs.label || "value");
    const sourceLineId = String(node.attrs.sourceLineId || "");
    const sourceLine = Number(node.attrs.sourceLine || 0);
    const placeholderKey = String(node.attrs.placeholderKey || "");
    const sourceValue = String(node.attrs.sourceValue || "");
    const flash = node.attrs.flash === true;
    const classes = ["semantic-reference-chip"];
    if (flash) {
      classes.push("semantic-reference-flash");
    }
    return [
      "span",
      {
        class: classes.join(" "),
        "data-reference-token": "true",
        "data-source-line-id": sourceLineId,
        "data-source-line": sourceLine > 0 ? String(sourceLine) : "",
        "data-placeholder-key": placeholderKey,
        "data-source-value": sourceValue,
        "data-source-label": label,
        "data-result": sourceValue,
        "data-flash": flash ? "true" : "false",
        title: sourceValue || label,
        "aria-label": label,
        draggable: "true",
      },
      label,
    ];
  },
});
