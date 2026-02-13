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
  const tailTwo = state.doc.textBetween(end - 2, end, "", "");
  if (tailTwo === "=>") return end;
  if (end >= 3) {
    const tailThree = state.doc.textBetween(end - 3, end, "", "");
    if (tailThree === "=> ") return end - 1;
  }
  return null;
};

const getDeletionRangeForResult = (
  state: any,
  range: ResultRange
): { from: number; to: number; selectionFrom: number } => {
  const triggerEnd = getTriggerEndPos(state, range);
  if (triggerEnd !== null && triggerEnd > 0) {
    return { from: triggerEnd - 1, to: range.to, selectionFrom: triggerEnd - 1 };
  }

  const beforePos = range.from - 1;
  if (beforePos >= 0) {
    const maybeSpace = state.doc.textBetween(beforePos, range.from, "", "");
    if (maybeSpace === " ") {
      return { from: beforePos, to: range.to, selectionFrom: beforePos };
    }
  }
  return { from: range.from, to: range.to, selectionFrom: range.from };
};

export const ResultInteractionExtension = Extension.create({
  name: "resultInteractionExtension",
  priority: 1000,

  addKeyboardShortcuts() {
    return {
      "Mod-Backspace": () => {
        const { state, view } = this.editor;
        const { $from } = state.selection;
        if ($from.depth === 0) return false;
        let depth = $from.depth;
        while (depth > 0 && !$from.node(depth).isTextblock) {
          depth -= 1;
        }
        if (depth === 0) return false;
        const { tr } = state;
        const from = $from.before(depth);
        const to = $from.after(depth);
        tr.delete(from, to);
        const anchor = Math.min(from, tr.doc.content.size);
        tr.setSelection(Selection.near(tr.doc.resolve(anchor), -1));
        view.dispatch(tr);
        return true;
      },
      "Mod-Delete": () => {
        const { state, view } = this.editor;
        const { $from } = state.selection;
        const { tr } = state;
        if ($from.depth === 0) return false;
        let depth = $from.depth;
        while (depth > 0 && !$from.node(depth).isTextblock) {
          depth -= 1;
        }
        if (depth === 0) return false;
        const from = $from.before(depth);
        const to = $from.after(depth);
        tr.delete(from, to);
        const anchor = Math.min(from, tr.doc.content.size);
        tr.setSelection(Selection.near(tr.doc.resolve(anchor), -1));
        view.dispatch(tr);
        return true;
      },
      Backspace: () => {
        const { state, view } = this.editor;
        const { selection } = state;
        const range = getResultRangeInSelection(state, selection);
        if (!range) {
          if (!selection.empty) {
            const tr = state.tr.delete(selection.from, selection.to);
            const anchor = Math.max(1, Math.min(selection.from, tr.doc.content.size));
            tr.setSelection(TextSelection.create(tr.doc, anchor));
            view.dispatch(tr);
            return true;
          }

          const textSelection = selection as TextSelection;
          if (textSelection.$from.parentOffset === 0) {
            return false;
          }

          const deleteFrom = Math.max(1, textSelection.from - 1);
          const tr = state.tr.delete(deleteFrom, textSelection.from);
          const anchor = Math.max(1, Math.min(deleteFrom, tr.doc.content.size));
          tr.setSelection(TextSelection.create(tr.doc, anchor));
          view.dispatch(tr);
          return true;
        }
        if (!selection.empty) {
          const tr = state.tr.delete(selection.from, selection.to);
          const anchor = Math.min(Math.max(selection.from, 0), tr.doc.content.size);
          const resolved = tr.doc.resolve(anchor);
          tr.setSelection(Selection.near(resolved, -1));
          view.dispatch(tr);
          return true;
        }

        const deletion = getDeletionRangeForResult(state, range);
        const tr = state.tr.delete(deletion.from, deletion.to);
        tr.setSelection(TextSelection.create(tr.doc, deletion.selectionFrom));
        view.dispatch(tr);
        return true;
      },

      Delete: () => {
        const { state, view } = this.editor;
        const { selection } = state;
        const range = getResultRangeInSelection(state, selection);
        if (!range) return false;
        if (!selection.empty) {
          const tr = state.tr.delete(selection.from, selection.to);
          view.dispatch(tr);
          return true;
        }

        const deletion = getDeletionRangeForResult(state, range);
        const tr = state.tr.delete(deletion.from, deletion.to);
        tr.setSelection(TextSelection.create(tr.doc, deletion.selectionFrom));
        view.dispatch(tr);
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
