# Active Tasks

- Scope: keep only current active tasks here so repeated reads stay small.
- Archived history: `tasks/archive/todo-history-through-2026-03-23.md`.
- Rule: move completed or stale task blocks out of this file instead of letting it grow indefinitely.

# Header Brand Animation Refresh (2026-04-03)
- [x] Inspect the current renderer header structure and identify the smallest safe surface for a visual refresh.
- [x] Rebuild the top-left brand block with layered decorative elements that can support richer motion.
- [x] Restyle the header with a more distinctive animated identity while preserving existing navigation and status layout.
- [x] Verify the renderer build still passes after the header refresh.

## Review
- [x] Confirm the new top-left header brand renders correctly with animated effects.
- [x] Confirm the navigation tabs and right-side device status remain aligned and usable.
- [x] Confirm the renderer bundle still builds without TypeScript or CSS errors.

# Space Module (2026-03-25)
- [x] Audit console trigger sending flow, preset IPC, and device key model for reuse points.
- [x] Add space preset model and persistence in main/config/preload/renderer store layers.
- [x] Implement shared trigger execution helper so console and space use one send path.
- [x] Add a dedicated space panel with space CRUD, device selection, custom buttons, and execution logs.
- [x] Wire the space panel into the main app tabs and preserve existing console behavior.
- [x] Verify TypeScript build passes after the space module changes.

## Review
- [ ] Confirm a saved space can persist name, description, device list, and custom buttons after reload.
- [ ] Confirm clicking a space button sends its `triggerKey` to all devices configured in that space.
- [ ] Confirm the existing console panel still sends trigger keys successfully.

# Trigger Scene Input ReferenceError Fix (2026-03-23)
- [x] Inspect the trigger-to-scene execution stack for the ``executeWindowsInputAction`` runtime failure.
- [x] Restore the missing Windows input helper import in the execution engine.
- [ ] Verify trigger-driven scene execution no longer throws ``ReferenceError: executeWindowsInputAction is not defined``.

## Review
- [ ] Confirm trigger key execution enters scene orchestration without the missing-function runtime error.

# Mouse Preset Save Feedback (2026-03-23)
- [x] Locate why saving a newly added mouse preset can appear unresponsive after setting a mouse point.
- [x] Add explicit validation and save-result feedback to the mouse preset editor.
- [ ] Verify adding a mouse preset now reports missing required fields and closes normally on successful save.

## Review
- [ ] Confirm clicking save without a preset name shows an in-app error instead of silently doing nothing.
- [ ] Confirm clicking save with a valid mouse preset shows success feedback and closes the dialog.

# Scene Delay Field Split (2026-03-23)
- [x] Inspect scene editor and executor usage of delay-step duration versus pre-delay.
- [x] Split delay-step duration from generic step pre-delay while keeping old scene data compatible.
- [x] Verify scene editor and executor both read the corrected delay semantics.

## Review
- [ ] Confirm delay steps edit only their own duration field.
- [ ] Confirm non-delay steps keep a separate pre-delay field.
- [ ] Confirm legacy delay steps still execute with the stored duration.

# Trigger Scene Real Input Execution (2026-03-23)
- [x] Audit trigger-to-scene execution path for software, keyboard, mouse, and delay steps.
- [x] Replace keyboard and mouse executor placeholders with real Windows input simulation.
- [ ] Verify trigger-driven scenes can execute software launch, delays, keyboard input, mouse move/click/scroll.

## Review
- [ ] Confirm trigger key execution still resolves the bound scene.
- [ ] Confirm keyboard steps emit real key/text input instead of log-only placeholders.
- [ ] Confirm mouse steps emit real move/click/scroll actions instead of log-only placeholders.

# Mouse Preset Delay Step (2026-03-23)
- [x] Expand mouse preset step model to support delay-only steps.
- [x] Add delay editing UI to the mouse preset dialog with only a duration field.
- [ ] Verify mouse presets can save and execute delay steps in sequence.

## Review
- [ ] Confirm mouse presets now allow adding a delay step.
- [ ] Confirm delay steps only expose delay time and persist after save/reopen.
- [ ] Confirm executor waits for the configured mouse preset delay.





