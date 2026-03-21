## Context

The recorder, configuration center, and scene editor currently share a loosely defined input-step model. Keyboard presets still accept some non-keyboard shapes in the UI, recorder output is only partly normalized, and mouse steps in scenes expose only a subset of useful parameters in summaries and editing controls.

The implementation needs to tighten the boundaries without breaking existing stored data. The current codebase already has migration logic for mouse steps inside input presets, so the safest path is to keep compatibility at load time while enforcing stricter save-time normalization and clearer editor interactions.

## Goals / Non-Goals

**Goals:**
- Make recorder editing step-scoped instead of list-scoped for common actions.
- Keep list-level context actions available, but separate them from per-step actions.
- Ensure input presets only persist keyboard macro content.
- Improve scene mouse step editing and preview detail.
- Preserve backward compatibility for older presets where possible.

**Non-Goals:**
- Introduce a brand-new recording engine or global hotkey redesign.
- Add new transport or execution dependencies.
- Redesign unrelated configuration center tabs.

## Decisions

- Keep the existing shared `InputStep` and `SceneStep` families, but enforce stricter normalization at save/import boundaries instead of introducing a new persistence layer. This minimizes churn and keeps older stored data readable.
- Implement recorder step actions as a true per-item context menu, with list-level actions attached to empty space. This is clearer than a single global menu because the intent depends on where the user clicked.
- Normalize recorder output into keyboard-dominant macro segments plus scene-friendly mouse steps. This matches the existing scene import bridge and avoids overloading input presets with non-keyboard data.
- Keep mouse step details in the scene editor as regular form fields and summary text instead of introducing a separate editor panel. The data model is already close enough that a lighter-weight form extension is sufficient.

## Risks / Trade-offs

- [Risk] Existing user presets may still contain legacy mouse steps. → Mitigation: keep the current load-time migration path and filter non-keyboard content again on save.
- [Risk] Recorder preview and edit behavior can become stateful quickly. → Mitigation: keep editing local to the dialog and reset preview timers on close/save.
- [Risk] Scene summaries may grow too verbose once more mouse fields are shown. → Mitigation: keep summaries compact and reserve full details for the editor form.

## Migration Plan

1. Preserve the current load-time migration of mouse steps out of input presets.
2. Update renderer save/update flows so keyboard presets reject or strip mouse content before persistence.
3. Update recorder import normalization so keyboard sequences and mouse steps are separated consistently.
4. Verify build and manually review the recorder dialog, scene editor, and preset lists.

Rollback is straightforward because the change does not add a new storage backend or schema version; reverting the renderer and store logic restores the previous behavior.

## Open Questions

- Should recorder mouse actions eventually support drag/scroll capture too, or is click/move enough for this iteration?
- Should step-level duplicate be exposed only in the recorder, or also in scene editing for parity later?
