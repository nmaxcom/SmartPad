import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "prosemirror-state";
import { Node as ProseMirrorNode } from "prosemirror-model";
import { EditorView } from "prosemirror-view";
import {
  SelectionInsightGroup,
  computeSelectionInsightGroups,
} from "../analysis/selectionInsights";

const pluginKey = new PluginKey("selectionInsights");

const selectedTextWithoutResultTokens = (
  doc: ProseMirrorNode,
  from: number,
  to: number
): string => {
  let text = "";
  let previousBlockPos = -1;
  doc.nodesBetween(from, to, (node, pos) => {
    if (node.type.name === "resultToken" || node.type.name === "referenceToken") {
      return false;
    }
    if (node.isTextblock && previousBlockPos >= 0 && pos !== previousBlockPos) {
      text += "\n";
    }
    if (node.isTextblock) previousBlockPos = pos;
    if (node.isText && node.text) {
      const start = Math.max(from, pos) - pos;
      const end = Math.min(to, pos + node.nodeSize) - pos;
      text += node.text.slice(Math.max(0, start), Math.max(0, end));
    }
    return undefined;
  });
  return text;
};

const formatValue = (value: any): string => value.toString({ precision: 6 });

const insertSummaryExpression = (
  view: EditorView,
  group: SelectionInsightGroup,
  operation: "sum" | "mean" | "min" | "max"
) => {
  const expression = `${operation}(${group.literals.join(", ")}) =>`;
  const paragraph = view.state.schema.nodes.paragraph.create(
    null,
    view.state.schema.text(expression)
  );
  const depth = Math.max(1, view.state.selection.$to.depth);
  const insertPos = view.state.selection.$to.after(depth);
  let tr = view.state.tr.insert(insertPos, paragraph);
  tr = tr.setSelection(TextSelection.near(tr.doc.resolve(insertPos + 1)));
  view.dispatch(tr.scrollIntoView());
  view.focus();
};

export const SelectionInsightsExtension = Extension.create({
  name: "selectionInsights",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: pluginKey,
        view(view) {
          const root = document.createElement("div");
          root.className = "smartpad-selection-insights";
          root.setAttribute("role", "toolbar");
          root.setAttribute("aria-label", "Selection statistics");
          root.style.display = "none";
          document.body.appendChild(root);

          const render = (currentView: EditorView) => {
            const { selection } = currentView.state;
            if (selection.empty || !currentView.hasFocus()) {
              root.style.display = "none";
              root.replaceChildren();
              return;
            }
            const text = selectedTextWithoutResultTokens(
              currentView.state.doc,
              selection.from,
              selection.to
            );
            const groups = computeSelectionInsightGroups(text);
            if (groups.length === 0) {
              root.style.display = "none";
              root.replaceChildren();
              return;
            }

            root.replaceChildren();
            groups.forEach((group) => {
              const row = document.createElement("div");
              row.className = "smartpad-selection-insight-row";
              const count = document.createElement("span");
              count.className = "smartpad-selection-insight-count";
              count.textContent =
                group.label === "numbers"
                  ? `${group.count} numbers`
                  : `${group.count} values · ${group.label}`;
              row.appendChild(count);

              const operations: Array<{
                key: "sum" | "mean" | "min" | "max";
                label: string;
                value: any;
              }> = [
                { key: "sum", label: "Σ", value: group.sum },
                { key: "mean", label: "μ", value: group.mean },
                { key: "min", label: "min", value: group.min },
                { key: "max", label: "max", value: group.max },
              ];
              operations.forEach((operation) => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "smartpad-selection-insight-action";
                button.textContent = `${operation.label} ${formatValue(operation.value)}`;
                button.title = `Insert ${operation.key}(…) as a live SmartPad calculation`;
                button.setAttribute("aria-label", button.title);
                button.addEventListener("mousedown", (event) => event.preventDefault());
                button.addEventListener("click", () =>
                  insertSummaryExpression(currentView, group, operation.key)
                );
                row.appendChild(button);
              });
              root.appendChild(row);
            });

            root.style.display = "flex";
            const anchor = currentView.coordsAtPos(selection.to);
            const box = root.getBoundingClientRect();
            const left = Math.min(
              Math.max(8, anchor.left),
              Math.max(8, window.innerWidth - box.width - 8)
            );
            const preferredTop = anchor.bottom + 8;
            const top =
              preferredTop + box.height < window.innerHeight - 8
                ? preferredTop
                : Math.max(8, anchor.top - box.height - 8);
            root.style.left = `${left}px`;
            root.style.top = `${top}px`;
          };

          let positionFrame = 0;
          const scheduleRender = () => {
            if (positionFrame) return;
            positionFrame = window.requestAnimationFrame(() => {
              positionFrame = 0;
              render(view);
            });
          };
          const onFocusChange = () => window.setTimeout(scheduleRender, 0);
          view.dom.addEventListener("focus", onFocusChange, true);
          view.dom.addEventListener("blur", onFocusChange, true);
          document.addEventListener("scroll", scheduleRender, true);
          window.addEventListener("resize", scheduleRender);
          render(view);

          return {
            update(updatedView) {
              render(updatedView);
            },
            destroy() {
              if (positionFrame) window.cancelAnimationFrame(positionFrame);
              view.dom.removeEventListener("focus", onFocusChange, true);
              view.dom.removeEventListener("blur", onFocusChange, true);
              document.removeEventListener("scroll", scheduleRender, true);
              window.removeEventListener("resize", scheduleRender);
              root.remove();
            },
          };
        },
      }),
    ];
  },
});
