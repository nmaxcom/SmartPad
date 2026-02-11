import { Node } from "@tiptap/core";

export const ResultInlineNode = Node.create({
  name: "resultToken",

  inline: true,
  group: "inline",
  content: "text*",
  selectable: false,
  draggable: true,

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
      sourceLineId: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-source-line-id") || "",
      },
      sourceLine: {
        default: 0,
        parseHTML: (element) => Number(element.getAttribute("data-source-line") || 0),
      },
      sourceLabel: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-source-label") || "",
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
    const sourceLineId = String(node.attrs.sourceLineId || "");
    const sourceLine = Number(node.attrs.sourceLine || 0);
    const sourceLabel = String(node.attrs.sourceLabel || "");
    const resultClass = isError ? "semantic-error-result" : "semantic-result-display";

    const resultClasses = [resultClass];
    if (!isError && flash) {
      resultClasses.push("semantic-result-flash");
    }

    const contentNode: any[] = [
      "span",
      {
        class: resultClasses.join(" "),
        "data-result": value,
        "data-source-line-id": sourceLineId,
        "data-source-line": sourceLine > 0 ? String(sourceLine) : "",
        "data-source-label": sourceLabel,
        title: value,
        "aria-label": value,
        draggable: "true",
      },
      0,
    ];

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
      ],
    ];
  },
});
