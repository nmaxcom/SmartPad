"use strict";
/**
 * Number Scrubber Extension for SmartPad
 *
 * Enables interactive dragging of literal numbers in the editor.
 * Users can click and drag horizontally on any scrubbable number to modify its value.
 * Simple clicks place the cursor and remove scrubber styling.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NumberScrubberExtension = void 0;
const core_1 = require("@tiptap/core");
const prosemirror_state_1 = require("prosemirror-state");
exports.NumberScrubberExtension = core_1.Extension.create({
    name: "numberScrubber",
    addProseMirrorPlugins() {
        return [
            new prosemirror_state_1.Plugin({
                key: new prosemirror_state_1.PluginKey("numberScrubber"),
                props: {
                    handleDOMEvents: {
                        mousedown: (view, event) => {
                            const target = event.target;
                            // Check if we clicked on a scrubbable number
                            if (target.classList.contains("semantic-scrubbableNumber")) {
                                const text = target.textContent || "";
                                const value = parseFloat(text.replace(/,/g, ""));
                                if (isNaN(value))
                                    return false; // Let normal text editing handle this
                                // Calculate decimal places for precision preservation
                                const decimalPlaces = getDecimalPlaces(text);
                                // Find position in document
                                const pos = view.posAtDOM(target, 0);
                                if (pos === null)
                                    return false;
                                // Calculate click position within the number for cursor placement
                                const rect = target.getBoundingClientRect();
                                const clickX = event.clientX - rect.left;
                                const relativePosition = Math.min(Math.max(clickX / rect.width, 0), 1);
                                const cursorOffset = Math.round(relativePosition * text.length);
                                const cursorPos = pos + cursorOffset;
                                // Store scrub state
                                const scrubState = {
                                    isDragging: false, // Start as not dragging
                                    startValue: value,
                                    startX: event.clientX,
                                    elementStart: pos,
                                    elementEnd: pos + text.length,
                                    originalText: text,
                                    decimalPlaces,
                                    dragElement: target,
                                    hasMoved: false,
                                };
                                // Store state on the plugin
                                const plugin = this;
                                plugin.scrubState = scrubState;
                                // Prevent default immediately to avoid cursor placement and text selection
                                event.preventDefault();
                                // Hide cursor and show ew-resize immediately
                                document.body.classList.add("number-scrubbing");
                                // Add global mouse handlers
                                const handleMouseMove = (e) => {
                                    const deltaX = Math.abs(e.clientX - scrubState.startX);
                                    // If we've moved more than a few pixels, start dragging
                                    if (deltaX > 3 && !scrubState.hasMoved) {
                                        scrubState.hasMoved = true;
                                        scrubState.isDragging = true;
                                        target.classList.add("dragging");
                                        event.preventDefault(); // Prevent text selection once we start dragging
                                    }
                                    if (scrubState.isDragging) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        // Calculate drag distance and new value
                                        const actualDeltaX = e.clientX - scrubState.startX;
                                        const sensitivity = calculateSensitivity(scrubState.startValue, scrubState.decimalPlaces);
                                        const deltaValue = actualDeltaX * sensitivity;
                                        const newValue = scrubState.startValue + deltaValue;
                                        // Apply bounds (prevent division by zero, extreme values)
                                        const boundedValue = applyBounds(newValue);
                                        // Format value preserving original precision
                                        const formattedValue = formatNumber(boundedValue, scrubState.decimalPlaces);
                                        // Update the document
                                        const tr = view.state.tr.replaceWith(scrubState.elementStart, scrubState.elementEnd, view.state.schema.text(formattedValue));
                                        // Update element end position for next update
                                        scrubState.elementEnd = scrubState.elementStart + formattedValue.length;
                                        view.dispatch(tr);
                                    }
                                };
                                const handleMouseUp = () => {
                                    // Remove dragging class and global cursor immediately
                                    if (scrubState.dragElement) {
                                        scrubState.dragElement.classList.remove("dragging");
                                    }
                                    document.body.classList.remove("number-scrubbing");
                                    // If we didn't move (simple click), allow normal cursor placement
                                    if (!scrubState.hasMoved) {
                                        // Place cursor at click position but keep the scrubbable mark
                                        const tr = view.state.tr;
                                        tr.setSelection(prosemirror_state_1.TextSelection.create(tr.doc, cursorPos));
                                        view.dispatch(tr);
                                        view.focus();
                                    }
                                    document.removeEventListener("mousemove", handleMouseMove);
                                    document.removeEventListener("mouseup", handleMouseUp);
                                    window.removeEventListener("mouseleave", handleMouseUp);
                                    // Clean up plugin state
                                    delete plugin.scrubState;
                                };
                                document.addEventListener("mousemove", handleMouseMove);
                                document.addEventListener("mouseup", handleMouseUp);
                                window.addEventListener("mouseleave", handleMouseUp); // Clean up if mouse leaves window
                                return true; // Always handle scrubbable number clicks
                            }
                            return false; // Not handled
                        },
                    },
                },
            }),
        ];
    },
});
/**
 * Calculate drag sensitivity based on number magnitude and decimal precision
 */
function calculateSensitivity(value, decimalPlaces) {
    const absValue = Math.abs(value);
    // For very small decimals, use fine precision
    if (decimalPlaces >= 3) {
        return Math.pow(10, -decimalPlaces) / 3; // 0.001 becomes ~0.0003 per pixel
    }
    // For 2 decimal places (like 0.21)
    if (decimalPlaces === 2) {
        return 0.01 / 3; // ~0.003 per pixel
    }
    // For 1 decimal place (like 0.2)
    if (decimalPlaces === 1) {
        return 0.1 / 3; // ~0.03 per pixel
    }
    // For integers, scale by magnitude
    if (absValue < 10) {
        return 1 / 3; // ~0.33 per pixel for single digits
    }
    else if (absValue < 100) {
        return 1 / 2; // ~0.5 per pixel for double digits
    }
    else if (absValue < 1000) {
        return 1; // 1 per pixel for hundreds
    }
    else {
        return 10; // 10 per pixel for thousands+
    }
}
/**
 * Get number of decimal places in a string representation
 */
function getDecimalPlaces(text) {
    const dotIndex = text.indexOf(".");
    if (dotIndex === -1)
        return 0;
    return text.length - dotIndex - 1;
}
/**
 * Apply reasonable bounds to prevent mathematical errors
 */
function applyBounds(value) {
    // Prevent extremely large numbers that could crash evaluation
    if (Math.abs(value) > 1e10) {
        return Math.sign(value) * 1e10;
    }
    // Prevent values very close to zero (but allow exact zero)
    if (Math.abs(value) < 1e-10 && value !== 0) {
        return 0;
    }
    return value;
}
/**
 * Format number preserving original decimal precision
 */
function formatNumber(value, decimalPlaces) {
    if (decimalPlaces === 0) {
        return Math.round(value).toString();
    }
    return value.toFixed(decimalPlaces);
}
