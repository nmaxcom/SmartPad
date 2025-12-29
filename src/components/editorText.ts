import type { Editor as TiptapEditor, TextSerializer } from "@tiptap/core";

const skipResultToken: TextSerializer = () => "";

export const getSmartPadText = (editor?: TiptapEditor | null): string => {
  if (!editor) return "";

  return editor.getText({
    blockSeparator: "\n",
    textSerializers: {
      resultToken: skipResultToken,
    },
  });
};
