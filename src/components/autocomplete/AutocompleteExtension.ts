import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";
import type { EditorState, Transaction } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import type { FunctionDefinitionNode } from "../../parsing/ast";
import type { AutocompleteManualShortcut, Variable } from "../../state/types";
import { keyboardShortcutMatchesEvent } from "../../utils/keyboardShortcut";
import { AutocompleteItem, getAutocompleteSuggestions } from "./suggestions";

interface AutocompleteState {
  active: boolean;
  items: AutocompleteItem[];
  selectedIndex: number;
  anchorPos: number;
}

interface AutocompleteOptions {
  getVariableContext?: () => Map<string, Variable>;
  getFunctionStore?: () => Map<string, FunctionDefinitionNode>;
  getManualShortcut?: () => AutocompleteManualShortcut;
}

const pluginKey = new PluginKey<AutocompleteState>("smartpad-autocomplete");
const INITIAL_RENDER_ITEM_COUNT = 24;
const FOLLOW_UP_RENDER_ITEM_COUNT = 64;
const MENU_VIEWPORT_PADDING = 8;
const MENU_ANCHOR_GAP = 8;

interface AutocompleteMenuPositionInput {
  anchor: Pick<DOMRect, "top" | "bottom" | "left">;
  menu: Pick<DOMRect, "width" | "height">;
  viewportWidth: number;
  viewportHeight: number;
}

export interface AutocompleteMenuPosition {
  left: number;
  top: number;
  placement: "above" | "below";
}

export function calculateAutocompleteMenuPosition({
  anchor,
  menu,
  viewportWidth,
  viewportHeight,
}: AutocompleteMenuPositionInput): AutocompleteMenuPosition {
  const spaceBelow =
    viewportHeight - anchor.bottom - MENU_ANCHOR_GAP - MENU_VIEWPORT_PADDING;
  const spaceAbove = anchor.top - MENU_ANCHOR_GAP - MENU_VIEWPORT_PADDING;
  const placement =
    spaceBelow < menu.height && spaceAbove > spaceBelow ? "above" : "below";
  const preferredTop =
    placement === "above"
      ? anchor.top - MENU_ANCHOR_GAP - menu.height
      : anchor.bottom + MENU_ANCHOR_GAP;
  const maxLeft = Math.max(
    MENU_VIEWPORT_PADDING,
    viewportWidth - menu.width - MENU_VIEWPORT_PADDING,
  );
  const maxTop = Math.max(
    MENU_VIEWPORT_PADDING,
    viewportHeight - menu.height - MENU_VIEWPORT_PADDING,
  );

  return {
    left: Math.max(MENU_VIEWPORT_PADDING, Math.min(anchor.left, maxLeft)),
    top: Math.max(MENU_VIEWPORT_PADDING, Math.min(preferredTop, maxTop)),
    placement,
  };
}

const emptyState: AutocompleteState = {
  active: false,
  items: [],
  selectedIndex: -1,
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
  selectedIndex: number | undefined = undefined,
  trigger: "auto" | "manual" = "auto",
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
    trigger,
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
    selectedIndex:
      typeof selectedIndex === "number"
        ? Math.max(-1, Math.min(selectedIndex, items.length - 1))
        : trigger === "manual"
          ? 0
          : -1,
    anchorPos: state.selection.from,
  };
}

function setMeta(tr: Transaction, value: Partial<AutocompleteState> | "close") {
  return tr.setMeta(pluginKey, value);
}

function applyItem(view: EditorView, item: AutocompleteItem) {
  const tr = view.state.tr.insertText(
    item.insertText,
    item.replaceFrom,
    item.replaceTo,
  );
  const cursorPos = item.replaceFrom + item.insertText.length;
  tr.setSelection(TextSelection.create(tr.doc, cursorPos));
  view.dispatch(setMeta(tr, "close"));
  view.focus();
}

function openManualAutocomplete(
  view: EditorView,
  options: AutocompleteOptions,
): boolean {
  const nextState = buildState(view.state, options, 0, "manual");
  view.dispatch(setMeta(view.state.tr, nextState.active ? nextState : "close"));
  return nextState.active;
}

function isEditorFocusWithin(view: EditorView): boolean {
  const activeElement = document.activeElement;
  return (
    view.hasFocus() ||
    Boolean(activeElement && view.dom.contains(activeElement))
  );
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
            const manualShortcut =
              options.getManualShortcut?.() || "Ctrl+Shift+K";
            if (keyboardShortcutMatchesEvent(manualShortcut, event)) {
              event.preventDefault();
              openManualAutocomplete(view, options);
              return true;
            }

            if (!state.active || state.items.length === 0) {
              return false;
            }

            if (event.key === "ArrowDown") {
              event.preventDefault();
              const selectedIndex =
                state.selectedIndex < 0
                  ? 0
                  : (state.selectedIndex + 1) % state.items.length;
              view.dispatch(setMeta(view.state.tr, { selectedIndex }));
              return true;
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              const selectedIndex =
                state.selectedIndex < 0
                  ? state.items.length - 1
                  : (state.selectedIndex - 1 + state.items.length) %
                    state.items.length;
              view.dispatch(setMeta(view.state.tr, { selectedIndex }));
              return true;
            }

            if (event.key === "Tab") {
              event.preventDefault();
              applyItem(
                view,
                state.items[state.selectedIndex >= 0 ? state.selectedIndex : 0],
              );
              return true;
            }

            if (event.key === "Enter") {
              if (state.selectedIndex < 0) {
                // Automatic suggestions are informational until the user navigates
                // them. Preserve Enter as the editor's newline command so a passive
                // menu can never rewrite a completed expression.
                view.dispatch(setMeta(view.state.tr, "close"));
                return false;
              }
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

          let pendingRenderFrame: number | null = null;
          let pendingPositionFrame: number | null = null;
          let renderGeneration = 0;

          const cancelPendingRender = () => {
            renderGeneration += 1;
            if (pendingRenderFrame !== null) {
              window.cancelAnimationFrame(pendingRenderFrame);
              pendingRenderFrame = null;
            }
          };

          const createItemButton = (
            item: AutocompleteItem,
            index: number,
            state: AutocompleteState,
          ) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className =
              index === state.selectedIndex
                ? "smartpad-autocomplete-item smartpad-autocomplete-item-active"
                : "smartpad-autocomplete-item";
            button.setAttribute("role", "option");
            button.setAttribute("aria-setsize", String(state.items.length));
            button.setAttribute("aria-posinset", String(index + 1));
            button.setAttribute(
              "aria-selected",
              index === state.selectedIndex ? "true" : "false",
            );
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
            return button;
          };

          const positionMenu = (state: AutocompleteState) => {
            const anchor = view.coordsAtPos(state.anchorPos);
            const menuRect = menu.getBoundingClientRect();
            const position = calculateAutocompleteMenuPosition({
              anchor,
              menu: menuRect,
              viewportWidth: window.innerWidth,
              viewportHeight: window.innerHeight,
            });
            menu.style.left = `${position.left}px`;
            menu.style.top = `${position.top}px`;
            menu.dataset.placement = position.placement;
          };

          const scheduleMenuPosition = () => {
            if (pendingPositionFrame !== null) {
              return;
            }
            pendingPositionFrame = window.requestAnimationFrame(() => {
              pendingPositionFrame = null;
              const state = pluginKey.getState(view.state) || emptyState;
              if (
                state.active &&
                state.items.length > 0 &&
                menu.style.display !== "none"
              ) {
                positionMenu(state);
              }
            });
          };

          const render = () => {
            cancelPendingRender();
            const generation = renderGeneration;
            const state = pluginKey.getState(view.state) || emptyState;
            menu.textContent = "";

            if (!state.active || state.items.length === 0) {
              menu.style.display = "none";
              delete menu.dataset.placement;
              return;
            }
            menu.style.display = "block";

            const appendItems = (start: number, end: number) => {
              const fragment = document.createDocumentFragment();
              for (let index = start; index < end; index += 1) {
                fragment.appendChild(
                  createItemButton(state.items[index], index, state),
                );
              }
              menu.appendChild(fragment);
            };

            let renderedCount = Math.min(
              state.items.length,
              Math.max(INITIAL_RENDER_ITEM_COUNT, state.selectedIndex + 1),
            );
            appendItems(0, renderedCount);
            positionMenu(state);
            menu
              .querySelector(".smartpad-autocomplete-item-active")
              ?.scrollIntoView({ block: "nearest" });

            const appendNextBatch = () => {
              pendingRenderFrame = null;
              if (
                generation !== renderGeneration ||
                renderedCount >= state.items.length
              ) {
                return;
              }
              const nextCount = Math.min(
                state.items.length,
                renderedCount + FOLLOW_UP_RENDER_ITEM_COUNT,
              );
              appendItems(renderedCount, nextCount);
              renderedCount = nextCount;
              if (renderedCount < state.items.length) {
                pendingRenderFrame =
                  window.requestAnimationFrame(appendNextBatch);
              }
            };

            if (renderedCount < state.items.length) {
              pendingRenderFrame =
                window.requestAnimationFrame(appendNextBatch);
            }
          };

          render();

          const handleDocumentKeyDown = (event: KeyboardEvent) => {
            if (event.defaultPrevented || !isEditorFocusWithin(view)) {
              return;
            }
            const manualShortcut =
              options.getManualShortcut?.() || "Ctrl+Shift+K";
            if (!keyboardShortcutMatchesEvent(manualShortcut, event)) {
              return;
            }
            event.preventDefault();
            event.stopPropagation();
            openManualAutocomplete(view, options);
          };

          document.addEventListener("keydown", handleDocumentKeyDown, true);
          document.addEventListener("scroll", scheduleMenuPosition, true);
          window.addEventListener("resize", scheduleMenuPosition);

          return {
            update() {
              render();
            },
            destroy() {
              cancelPendingRender();
              if (pendingPositionFrame !== null) {
                window.cancelAnimationFrame(pendingPositionFrame);
                pendingPositionFrame = null;
              }
              document.removeEventListener(
                "keydown",
                handleDocumentKeyDown,
                true,
              );
              document.removeEventListener(
                "scroll",
                scheduleMenuPosition,
                true,
              );
              window.removeEventListener("resize", scheduleMenuPosition);
              menu.remove();
            },
          };
        },
      }),
    ];
  },
});
