## 1. Spec and Design
- [x] Finalize `configuration-center` delta spec for keyboard-only presets and detailed mouse scene steps.
- [x] Finalize `input-recorder` delta spec for step-level editing, context menus, and normalized output.
- [x] Confirm design decisions for save-time normalization and preview behavior.

## 2. Shared Types and Store
- [x] Tighten the shared `InputStep`/`SceneStep` helpers so recorder output can be normalized consistently.
- [x] Ensure input preset save/update paths strip non-keyboard content before persistence.
- [x] Keep legacy mouse-containing input presets compatible through existing migration logic.

## 3. Recorder Dialog
- [x] Add step-scoped context menu actions for edit, insert before/after, duplicate, and delete.
- [x] Add a dedicated single-step editor so recorded items can be adjusted in place.
- [x] Normalize preview, insert-delay, and clear-all behavior around the clicked step or empty list area.

## 4. Scene Editor
- [x] Expand mouse click and mouse move editing fields to capture the richer parameters required by the spec.
- [x] Improve scene step summaries so mouse details and pre-delay are readable at a glance.
- [x] Keep recorder import conversion aligned with the stricter keyboard-only preset boundary.

## 5. Verification
- [x] Run `npm run build` and fix any type or runtime issues introduced by the normalization changes.
- [x] Update `tasks/todo.md` with completed items and review notes.

