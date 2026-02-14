---
title: "File Management"
description: "Defines sheet storage, autosave, import/export behavior, trash lifecycle, and multi-tab synchronization."
---

> Source: `docs/Specs/FileManagement.spec.md`

## At a glance

Defines sheet storage, autosave, import/export behavior, trash lifecycle, and multi-tab synchronization.

## Quick examples

Examples for this feature are being backfilled.

## What this covers

- 1. Objective
- 2. Technical Architecture
- 3. User Experience & UI Flow
- 4. Functional Requirements

## Full specification

<details>
<summary>Open full spec: File Management</summary>

This technical specification defines the **Smartpad File Management & Persistence System**. The goal is to provide a seamless, "local-first" experience where users feel their work is as permanent as a physical notebook without ever needing to click a "Save" button.

---

## 1. Objective

Build a robust, markdown-based file management system using **IndexedDB** for persistence. It must support multiple sheets, sidebar navigation, and effortless import/export functionality while maintaining a "scratchpad" aesthetic.

---

## 2. Technical Architecture

### A. Storage Engine (IndexedDB)

The primary source of truth is the browser's **IndexedDB**.

* **Possible schema:**
* `id`: Unique UUID.
* `title`: String (parsed from the first `#` heading in the markdown).
* `content`: Full plaintext string.
* `last_modified`: Timestamp.
* `is_trashed`: Boolean (Default: `false`).



### B. The Sync Mechanism (Multi-Tab Support)

To prevent "Ghost Tabs" from overwriting data, use the **BroadcastChannel API**.

* **Action:** When any tab commits a save to IndexedDB, it broadcasts a message containing the `id` of the updated sheet.
* **Reaction:** Other open tabs listen for this message. If they are currently viewing the same `id`, they silently update their internal state/editor content to match.

---

## 3. User Experience & UI Flow

### The Sidebar (Main View)

The sidebar is a flat list of all sheets where `is_trashed == false`.

* **Sheet Titles:** Dynamically updated. If a sheet has no `# Header`, the UI shows the first 20 characters of the first line.
* **Inline Renaming:** Clicking the title in the sidebar transforms it into a text input. `Enter` to save; `Esc` to cancel.
* **Hover Actions:** When a user hovers over a sheet title, two icons appear:
1. **Trash icon:** Sets `is_trashed = true`. The sheet immediately disappears from the main list.
2. **Download icon:** Triggers an immediate browser download of that single `.md` file.

Use font awesome icons.

### The Trash View

A dedicated state to manage discarded sheets without cluttering the main list.

* **Access:** A "Trash" link at the bottom of the sidebar.
* **Interaction:** Clicking "Trash" replaces the main list with a list of sheets where `is_trashed == true`.
* **Actions in Trash:**
* **Restore:** Resets `is_trashed = false`.
* **Empty Trash:** Permanently deletes those records from IndexedDB.


* **Exit:** A "Back" link returns to the main sheet list.

### Import & Export

* **Individual Export:** Handled via the hover icon (Download `.md`).
* **Session Export:** A "Download All" button at the bottom of the sidebar. This bundles all active (non-trashed) sheets into a single `.zip` file.
* **Import (Drag & Drop):** The entire webapp is a drop-zone.
* **`.md` files:** Added as a new sheet.
* **`.zip` files:** Unzipped, and all internal `.md` files are added as individual sheets.
* **Conflict Logic:** If an imported filename matches an existing title, append a number: e.g., `Budget (1)`.


---

## 4. Functional Requirements

### A. Auto-Save Logic (Debounced)

The app must not save on every keystroke to optimize performance.

* **Threshold:** **1500ms** (1.5 seconds) of idle time.
* **Trigger:** After the user stops typing for 1.5s, the current editor content is committed to IndexedDB and the `last_modified` timestamp is updated.

### B. New Sheet Creation

* Clicking the `+` button at the top of the sidebar creates a blank record in IndexedDB and immediately switches the editor focus to that new sheet.

### C. Markdown Integrity

* Files are stored and exported as pure Markdown.
* No proprietary metadata should be injected into the text. The title should be inferred from the content, not stored separately in the file text.

</details>
