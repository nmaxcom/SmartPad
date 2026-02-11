import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { createLineId } from "../references/referenceIds";

const LINE_ID_ATTR = "lineId";

export const LineIdExtension = Extension.create({
  name: "lineIdExtension",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph"],
        attributes: {
          [LINE_ID_ATTR]: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-line-id"),
            renderHTML: (attributes) => {
              const lineId = attributes[LINE_ID_ATTR];
              if (!lineId) {
                return {};
              }
              return { "data-line-id": lineId };
            },
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction: (_transactions, _oldState, newState) => {
          const tr = newState.tr;
          let changed = false;
          const seen = new Set<string>();

          newState.doc.descendants((node, pos) => {
            if (node.type.name !== "paragraph") {
              return true;
            }
            const current = String(node.attrs?.[LINE_ID_ATTR] || "");
            if (!current || seen.has(current)) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                [LINE_ID_ATTR]: createLineId(),
              });
              changed = true;
              return false;
            }
            seen.add(current);
            return false;
          });

          return changed ? tr : null;
        },
      }),
    ];
  },
});

