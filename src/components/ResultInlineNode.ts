import { Node } from "@tiptap/core";

export const ResultInlineNode = Node.create({
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
    };
  },

  renderText({ node }) {
    return node.textContent || "";
  },

  renderHTML({ node }) {
    const value = node.attrs.value || "";
    const isError = !!node.attrs.isError;
    const resultClass = isError ? "semantic-error-result" : "semantic-result-display";

    return [
      "span",
      {
        class: "semantic-wrapper",
        "data-result-node": "true",
      },
      [
        "span",
        { class: "semantic-result-container" },
        [
          "span",
          {
            class: resultClass,
            "data-result": value,
            title: value,
            "aria-label": value,
          },
          0,
        ],
      ],
    ];
  },
});
