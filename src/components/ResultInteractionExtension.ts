import { Extension } from "@tiptap/core";
import { Plugin, Selection, TextSelection } from "@tiptap/pm/state";

type ResultRange = { from: number; to: number };

const isResultNode = (node: any): boolean => node?.type?.name === "resultToken";

const getResultRangeAtPos = (state: any, $pos: any): ResultRange | null => {
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

const getResultRangeInside = (state: any, $pos: any): ResultRange | null => {
  if (!isResultNode($pos.parent)) return null;
  const depth = $pos.depth;
  return { from: $pos.before(depth), to: $pos.after(depth) };
};

const getResultRangeInSelection = (state: any, selection: any): ResultRange | null => {
  if (selection.empty) {
    return getResultRangeAtPos(state, selection.$from);
  }

  let range: ResultRange | null = null;
  state.doc.nodesBetween(selection.from, selection.to, (node: any, pos: number) => {
    if (isResultNode(node)) {
      range = { from: pos, to: pos + node.nodeSize };
      return false;
    }
    return undefined;
  });
  return range;
};

const getTriggerEndPos = (state: any, range: ResultRange): number | null => {
  const end = range.from;
  if (end < 2) return null;
  const trigger = state.doc.textBetween(end - 2, end, "", "");
  if (trigger === "=>") return end;
  return null;
};

export const ResultInteractionExtension = Extension.create({
  name: "resultInteractionExtension",
  priority: 1000,

  addKeyboardShortcuts() {
    return {
      Backspace: () => {
        const { state, view } = this.editor;
        const { selection } = state;
        const range = getResultRangeInSelection(state, selection);
        if (!range) return false;
        if (!selection.empty) {
          const tr = state.tr.delete(selection.from, selection.to);
          const anchor = Math.min(Math.max(selection.from, 0), tr.doc.content.size);
          const resolved = tr.doc.resolve(anchor);
          tr.setSelection(Selection.near(resolved, -1));
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
        tr.setSelection(TextSelection.create(tr.doc, triggerEnd - 1));
        view.dispatch(tr);
        return true;
      },

      Delete: () => {
        const { state } = this.editor;
        const { selection } = state;
        const range = getResultRangeInSelection(state, selection);
        if (!range) return false;
        if (!selection.empty) return true;

        return true;
      },

      Enter: () => {
        const { state, view } = this.editor;
        const { selection } = state;

        const range = getResultRangeInSelection(state, selection);
        if (!range) return false;

        const tr = state.tr.setSelection(TextSelection.create(state.doc, range.to));
        view.dispatch(tr);
        return false;
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handleTextInput: (view, from, to, text) => {
            const { state } = view;
            if (from !== to) {
              let hasResult = false;
              state.doc.nodesBetween(from, to, (node: any) => {
                if (isResultNode(node)) {
                  hasResult = true;
                  return false;
                }
                return undefined;
              });
              return hasResult;
            }

            const range = getResultRangeInside(state, state.doc.resolve(from));
            if (!range) return false;

            const insertPos = range.to;
            const tr = state.tr.insertText(text, insertPos, insertPos);
            tr.setSelection(TextSelection.create(tr.doc, insertPos + text.length));
            view.dispatch(tr);
            return true;
          },
        },
      }),
    ];
  },
});
