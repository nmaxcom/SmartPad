import type { Editor as TiptapEditor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

export const getSmartPadText = (editor?: TiptapEditor | null): string => {
  if (!editor) return "";

  const lines: string[] = [];
  const { doc } = editor.state;

  doc.forEach((node: ProseMirrorNode) => {
    if (!node.isTextblock) return;
    lines.push(getTextWithoutResults(node));
  });

  return lines.join("\n");
};

const getTextWithoutResults = (node: ProseMirrorNode): string => {
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
