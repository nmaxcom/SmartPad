import type { Editor as TiptapEditor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

export interface SmartPadTextOptions {
  referenceMode?: "preserve" | "readable";
}

export const getSmartPadText = (
  editor?: TiptapEditor | null,
  options: SmartPadTextOptions = {}
): string => {
  if (!editor) return "";

  const lines: string[] = [];
  const { doc } = editor.state;
  const referenceMode = options.referenceMode ?? "preserve";

  doc.forEach((node: ProseMirrorNode) => {
    if (!node.isTextblock) return;
    lines.push(getTextWithoutResults(node, referenceMode));
  });

  return lines.join("\n");
};

const getTextWithoutResults = (
  node: ProseMirrorNode,
  referenceMode: "preserve" | "readable"
): string => {
  let text = "";
  node.descendants((child) => {
    if (child.type.name === "resultToken") {
      return false;
    }
    if (child.type.name === "referenceToken") {
      const key = String(child.attrs?.placeholderKey || "").trim();
      const sourceValue = String(child.attrs?.sourceValue || "").trim();
      const label = String(child.attrs?.label || "").trim();
      if (referenceMode === "preserve") {
        if (key) text += key;
      } else {
        text += sourceValue || label || "value";
      }
      return false;
    }
    if (child.isText) {
      text += child.text;
    }
    return undefined;
  });
  return text;
};
