import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";
import type { EditorState, Transaction } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import type { FunctionDefinitionNode } from "../../parsing/ast";
import type { Variable } from "../../state/types";
import {
  AutocompleteItem,
  getAutocompleteSuggestions,
} from "./suggestions";

interface AutocompleteState {
  active: boolean;
  items: AutocompleteItem[];
  selectedIndex: number;
  anchorPos: number;
}

interface AutocompleteOptions {
  getVariableContext?: () => Map<string, Variable>;
  getFunctionStore?: () => Map<string, FunctionDefinitionNode>;
}

const pluginKey = new PluginKey<AutocompleteState>("smartpad-autocomplete");

const emptyState: AutocompleteState = {
  active: false,
  items: [],
  selectedIndex: 0,
  anchorPos: 0,
};

function getTextCursorContext(state: EditorState): {
  lineText: string;
  cursorOffset: number;
  lineStart: number;
} | null {
  const { selection } = state;
  if (!selection.empty || !(selection instanceof TextSelection)) {
    return null;
  }

  const $from = selection.$from;
  const node = $from.parent;
  if (!node.isTextblock) {
    return null;
  }

  return {
    lineText: node.textContent,
    cursorOffset: $from.parentOffset,
    lineStart: $from.start(),
  };
}

function buildState(
  state: EditorState,
  options: AutocompleteOptions,
  selectedIndex = 0
): AutocompleteState {
  const cursorContext = getTextCursorContext(state);
  if (!cursorContext) {
    return emptyState;
  }

  const items = getAutocompleteSuggestions({
    lineText: cursorContext.lineText,
    cursorOffset: cursorContext.cursorOffset,
    variables: options.getVariableContext?.() || new Map(),
    functions: options.getFunctionStore?.() || new Map(),
  }).map((item) => ({
    ...item,
    replaceFrom: cursorContext.lineStart + item.replaceFrom,
    replaceTo: cursorContext.lineStart + item.replaceTo,
  }));

  if (items.length === 0) {
    return emptyState;
  }

  return {
    active: true,
    items,
    selectedIndex: Math.max(0, Math.min(selectedIndex, items.length - 1)),
    anchorPos: state.selection.from,
  };
}

function setMeta(tr: Transaction, value: Partial<AutocompleteState> | "close") {
  return tr.setMeta(pluginKey, value);
}

function applyItem(view: EditorView, item: AutocompleteItem) {
  const tr = view.state.tr.insertText(item.insertText, item.replaceFrom, item.replaceTo);
  const cursorPos = item.replaceFrom + item.insertText.length;
  tr.setSelection(TextSelection.create(tr.doc, cursorPos));
  view.dispatch(setMeta(tr, "close"));
  view.focus();
}

export const AutocompleteExtension = Extension.create<AutocompleteOptions>({
  name: "smartpadAutocomplete",

  addOptions() {
    return {};
  },

  addProseMirrorPlugins() {
    const options = this.options;

    return [
      new Plugin<AutocompleteState>({
        key: pluginKey,
        state: {
          init(_, state) {
            return buildState(state, options);
          },
          apply(tr, previous, _oldState, newState) {
            const meta = tr.getMeta(pluginKey);
            if (meta === "close") {
              return emptyState;
            }
            if (meta && typeof meta === "object") {
              return { ...previous, ...meta };
            }
            if (tr.docChanged) {
              return buildState(newState, options);
            }
            if (tr.selectionSet) {
              return emptyState;
            }
            return previous;
          },
        },
        props: {
          handleKeyDown(view, event) {
            const state = pluginKey.getState(view.state) || emptyState;
            if (!state.active || state.items.length === 0) {
              return false;
            }

            if (event.key === "ArrowDown") {
              event.preventDefault();
              const selectedIndex = (state.selectedIndex + 1) % state.items.length;
              view.dispatch(setMeta(view.state.tr, { selectedIndex }));
              return true;
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              const selectedIndex =
                (state.selectedIndex - 1 + state.items.length) % state.items.length;
              view.dispatch(setMeta(view.state.tr, { selectedIndex }));
              return true;
            }

            if (event.key === "Enter" || event.key === "Tab") {
              event.preventDefault();
              applyItem(view, state.items[state.selectedIndex]);
              return true;
            }

            if (event.key === "Escape") {
              event.preventDefault();
              view.dispatch(setMeta(view.state.tr, "close"));
              return true;
            }

            return false;
          },
        },
        view(view) {
          const menu = document.createElement("div");
          menu.className = "smartpad-autocomplete-menu";
          menu.setAttribute("role", "listbox");
          menu.setAttribute("aria-label", "Autocomplete suggestions");
          menu.style.display = "none";
          document.body.appendChild(menu);

          const render = () => {
            const state = pluginKey.getState(view.state) || emptyState;
            menu.textContent = "";

            if (!state.active || state.items.length === 0) {
              menu.style.display = "none";
              return;
            }

            state.items.forEach((item, index) => {
              const button = document.createElement("button");
              button.type = "button";
              button.className =
                index === state.selectedIndex
                  ? "smartpad-autocomplete-item smartpad-autocomplete-item-active"
                  : "smartpad-autocomplete-item";
              button.setAttribute("role", "option");
              button.setAttribute("aria-selected", index === state.selectedIndex ? "true" : "false");
              button.addEventListener("mousedown", (event) => {
                event.preventDefault();
                applyItem(view, item);
              });

              const label = document.createElement("span");
              label.className = "smartpad-autocomplete-label";
              label.textContent = item.label;

              const detail = document.createElement("span");
              detail.className = "smartpad-autocomplete-detail";
              detail.textContent = item.detail;

              const kind = document.createElement("span");
              kind.className = `smartpad-autocomplete-kind smartpad-autocomplete-kind-${item.kind}`;
              kind.textContent = item.kind;

              button.appendChild(label);
              button.appendChild(detail);
              button.appendChild(kind);
              menu.appendChild(button);
            });

            const coords = view.coordsAtPos(state.anchorPos);
            menu.style.left = `${Math.max(8, Math.min(coords.left, window.innerWidth - 328))}px`;
            menu.style.top = `${Math.min(coords.bottom + 8, window.innerHeight - 48)}px`;
            menu.style.display = "block";
          };

          render();

          return {
            update() {
              render();
            },
            destroy() {
              menu.remove();
            },
          };
        },
      }),
    ];
  },
});
