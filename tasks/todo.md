## Recorder Config Center Polish (2026-03-21)
- [x] Draft proposal/spec/design/tasks for the recorder/config-center polish change.
- [x] Tighten input preset persistence to keyboard-only macros and keep legacy mouse presets migrated.
- [x] Add recorder step-level editing and context menus.
- [x] Expand scene mouse fields and summaries.
- [x] Verify build after the normalization changes.

## Review
- [ ] Confirm keyboard presets persist as pure macros.
- [ ] Confirm recorder step actions work on individual steps.
- [ ] Confirm scene mouse details and summaries render correctly.
## Recorder Polish (2026-03-21)
- [x] Fix recorder context menu actions so insert-delay and clear-all act on the intended selection.
- [x] Clear preview timers when the recorder closes or saves.
- [x] Show preset names in scene step summaries instead of raw ids where possible.
- [x] Verify `npm run build` passes after the recorder polish pass.

## Review
- [ ] Confirm recorder context menu operations target the right step or list.
- [ ] Confirm scene summaries are easier to read during day-to-day editing.
## Recording Import Bridge (2026-03-21)
- [x] Add a scene editor entry point that opens the recorder dialog.
- [x] Convert recorder output into scene steps and auto-create keyboard presets for contiguous keyboard segments.
- [x] Preserve mouse clicks and standalone delays as direct scene steps during import.
- [x] Verify `npm run build` passes after the recorder-to-scene bridge.

## Review
- [ ] Confirm recorder imports append the expected scene steps without manual copy/paste.
- [ ] Confirm generated keyboard presets appear in the input preset list after import.
## Scene Step Delay Semantics (2026-03-21)
- [x] Add editable pre-delay to all scene step types.
- [x] Make the executor honor scene step delays before software/input/mouse actions.
- [x] Keep recorder input-step delays compatible without double waiting on explicit delay steps.
- [x] Verify `npm run build` passes after the delay semantics update.

## Review
- [ ] Confirm scene step delays execute before the intended action in the UI and runtime.
- [ ] Confirm recorder-generated delay steps still replay in order as expected.
## Scene Step Editor (2026-03-21)
- [x] Upgrade scene editing from preset checklists to a real step list editor.
- [x] Add explicit delay, mouse click, and mouse move step controls in the scene dialog.
- [x] Keep legacy scene entries compatible by deriving steps from preset ids when needed.
- [x] Verify `npm run build` passes after the scene editor refactor.

## Review
- [ ] Confirm scene editing now allows adding, reordering, and removing individual steps.
- [ ] Confirm delay and mouse step fields persist correctly after save and reload.
## Trigger Binding Simplification (2026-03-20)
- [x] Confirm the product model: trigger bindings are local-only `triggerKey -> scene` mappings.
- [x] Remove `deviceKey` from trigger binding data structures and trigger resolution flow.
- [x] Update trigger binding management UI to stop selecting devices.
- [x] Simplify console trigger sending UI by removing device-level precheck based on local binding tables.
- [x] Verify `npm run build` passes after the trigger model refactor.

## Review
- [ ] Confirm trigger binding creation/editing no longer asks for a device.
- [ ] Confirm incoming `EXECUTE_TRIGGER` resolves only by local `triggerKey`.
- [ ] Confirm the console still sends trigger keys to selected devices/groups successfully.

## Shared UI Namespace Refactor (2026-03-19)
- [x] Convert shared `Select`, `Tabs`, `Dialog`, and `ScrollArea` wrappers to namespace-style exports.
- [x] Update renderer panels to import the shared namespace wrappers instead of Radix primitives.
- [x] Verify the app still builds after the namespace refactor.

## Review
- [ ] Confirm the shared namespace wrappers preserve existing dialog/select/tabs/scroll behaviors in the UI.
- [x] Build verified with `npm run build`.
## New UI Component Migration (2026-03-19)
- [x] Replace core renderer pages with shared `ui` components where possible.
- [x] Update common controls in App, Settings, Config, Console, DeviceList, and Resource panels.
- [x] Verify the app still builds after the UI migration.

## Review
- [ ] Confirm the migrated screens consistently use shared `ui` primitives instead of raw HTML controls.
- [ ] Confirm no visible interaction regressions were introduced by the component swap.
- [x] Build verified with `npm run build`.
## Resource Station Scroll & History Cards (2026-03-19)
- [x] Replace share history groups with collapsed-by-default cards.
- [x] Limit collapsed previews and expanded card height within the share history panel.
- [x] Restore scrolling for share history, image selection list, and file selection list.
- [x] Refresh global scrollbar styling and verify `npm run build` passes.

## Review
- [ ] Confirm collapsed cards show compact image/file previews and can expand/collapse reliably.
- [ ] Confirm expanded history cards never grow beyond the visible share history area.
- [ ] Confirm share history, image selection list, and file selection list all scroll normally.
- [x] Replace native details with controlled accordions for reliable animations.
- [x] Ensure group buttons only show on hovered summary.
- [ ] Verify expand/collapse animation for online/offline/groups (no test run yet).
## TCP Port Update Bug (2026-03-18)
- [x] Identify why new TCP port not applied after settings save.
- [x] Update singleton getters to apply new config to existing services.
- [ ] Verify TCP/UDP restarts use updated ports (manual run).

## Review
- [ ] Confirm reconnect uses updated TCP port after saving settings.
- [ ] Check toggle behavior and arrow rotation across all sections.
## Settings Toast (2026-03-18)
- [x] Replace window alert with in-app toast in Settings panel.
- [ ] Verify save success/error toast shows correctly.
## Settings Tags & Device Groups (2026-03-18)
- [x] Allow comma-separated tag input in Settings without blocking English comma.
- [x] Use online sub-group names in device picker group filter.
- [ ] Verify tag input and group filter behavior in UI.
## Device Group Filter & Tags (2026-03-18)
- [x] Replace "全部分组" filter with online group names.
- [x] Show all tags in device info cards.
- [ ] Verify group filter and tag display in UI.
## Device Picker Dropdowns (2026-03-18)
- [x] Force device picker dropdowns to open downward.
- [x] Include all online sub-group names in group filters.
- [ ] Verify dropdown direction and group list in UI.
## Device Filter Dropdown Direction (2026-03-18)
- [x] Force group/status/tag dropdowns to open downward in device list.
- [ ] Verify dropdown direction visually.
## Resource Send Targets (2026-03-18)
- [x] Disable send button when text content is empty.
- [x] Add group send target with group dropdown.
- [ ] Verify group send behavior and empty-group prompt.
## Resource Toasts (2026-03-18)
- [x] Replace window alerts in Resource panel with in-app toasts.
- [ ] Verify toast messages for empty target/group.
## Resource Send Failure Handling (2026-03-18)
- [x] Keep text input and selected files when send fails.
- [ ] Verify failure behavior with offline target.
## Sonner Toast Migration (2026-03-18)
- [x] Audit existing Radix toast usage and global Toaster mount.
- [x] Replace `@radix-ui/react-toast` with `sonner` dependency.
- [x] Refine shared `sonner.tsx` Toaster configuration.
- [x] Migrate Config/Settings/Resource panels to `toast.success` and `toast.error`.
- [ ] Verify build passes and toast feedback still shows for success/error flows.

## Review
- [ ] Confirm ConfigPanel import/export feedback uses Sonner correctly.
- [ ] Confirm SettingsPanel save success/error feedback uses Sonner correctly.
- [ ] Confirm ResourcePanel target/copy/send failure feedback uses Sonner correctly.
## Image Offer Download Flow (2026-03-18)
- [x] Replace direct image push with image offer messages carrying metadata and thumbnail.
- [x] Add sender-side shared image registry in main process using original file paths.
- [x] Add on-demand image download over TCP chunk transfer and receiver-side progress events.
- [x] Add configurable download directory in settings and directory picker support.
- [x] Remove image compression option and update Resource panel UI states.
- [x] Verify TypeScript build passes for the new image offer/download flow.

## Review
- [ ] Confirm image send now only creates offers and does not immediately transfer the original file.
- [ ] Confirm download saves into configured directory and updates UI status.
- [ ] Confirm file/text sharing still works after TCP protocol changes.
## Shared Image Registry Persistence (2026-03-18)
- [x] Persist shared image registry to the user data directory.
- [x] Load shared image registry during app startup.
- [x] Prune invalid shared image entries when source files are missing.
- [ ] Verify shared image offers still download after restarting the sender app.

## Electron Dev Blank Client Investigation (2026-03-18)
- [x] Inspect Electron dev startup flow and compare browser vs client behavior.
- [x] Reproduce blank client and capture renderer/main process mismatch.
- [x] Identify missing preload bridge methods causing Electron-only runtime failure.
- [x] Implement the minimal fix in preload and renderer safeguards.
- [ ] Verify 
pm run dev client window renders normally after the change.

## Review
- [x] Root cause confirmed: ResourcePanel subscribed to image download bridge methods that were not exposed by preload, so Electron hit TypeError while the browser short-circuited on missing window.electronAPI.
- [ ] Manually confirm the Electron dev window no longer shows a blank page.

## Resource Image Native Path Fix (2026-03-18)
- [x] Confirm image send path extraction was using unreliable File.path in renderer.
- [x] Expose Electron webUtils.getPathForFile(file) through preload bridge.
- [x] Update resource image picker to prefer the preload path API and keep legacy fallback.
- [x] Verify 
pm run build passes after the change.

## Review
- [x] Root cause confirmed: both drag-and-drop and file input produced File objects without a usable renderer path, so image sending always failed before registration.
- [ ] Manually confirm drag-and-drop and click-select images can now be added and sent in the Electron client.

## Resource Image Preview CSP Fix (2026-03-18)
- [x] Confirm image preview failure came from renderer CSP blocking lob: preview URLs.
- [x] Allow lob: and data: only for img-src in renderer HTML CSP.
- [x] Verify 
pm run build passes after the CSP update.

## Review
- [x] Root cause confirmed: selected image previews and thumbnail generation both depended on image URLs that violated the page CSP, so preview failed before send.
- [ ] Manually confirm selected images now render in the picker and can be sent in the Electron client.

## Resource Share History UX (2026-03-18)
- [x] Show locally sent text/image/file messages in share history.
- [x] Add green local badge for self-sent records.
- [x] Display image file names in image history items.
- [x] Add reveal-in-folder action for downloaded images.
- [x] Verify 
pm run build passes after the UI and IPC changes.

## Review
- [ ] Manually confirm self-sent text/image/file entries appear immediately in share history.
- [ ] Manually confirm downloaded image entries can open Explorer/Finder with the file selected.
## Resource File Offer Flow (2026-03-19)
- [x] Compare current image offer flow against direct file push flow and identify shared vs file-only behaviors.
- [x] Change file sending to use an offer + receiver download flow consistent with images.
- [x] Limit resource file sending to a single selected file at a time.
- [x] Remove file thumbnail handling and show file icon, name, and size in history/cards.
- [x] Verify `npm run build` passes after the file offer flow changes.

## Review
- [ ] Confirm sending a file only sends metadata first and does not immediately transfer file bytes.
- [ ] Confirm file picker and drag-drop keep only one selected file in file mode.
- [ ] Confirm received file entries show icon + file name + size and can download/open location correctly.
## Resource Batch Share Fix (2026-03-19)
- [x] Patch legacy preload bridge so registerSharedFile and download events exist at runtime.
- [x] Change file sending from direct push to file offers with receiver-side download requests.
- [x] Keep file multi-select enabled and batch related sends into one visible share record.
- [x] Keep image multi-send enabled and batch related sends into one visible share record.
- [x] Add file batch actions for single download and download-all in share history.
- [x] Verify `npm run build` passes after the batch share changes.

## Review
- [ ] Confirm Electron runtime no longer throws `registerSharedFile is not a function` when sending files.
- [ ] Confirm one send action with multiple files/images renders as one grouped history record.
- [ ] Confirm file batch record supports both `下载全部` and single-item `下载`.






## Components Type Errors (2026-03-19)
- [ ] Restore missing `Select` namespace members used by renderer panels.
- [ ] Sync renderer `AppSettings` with the persisted `downloads.directory` setting.
- [ ] Fix `icon-wrapper` ref typing so TypeScript checks pass.
- [ ] Verify `npx tsc --noEmit` and `npm run build` pass after the component fixes.
## Collapse Component Migration (2026-03-20)
- [x] Add a shared Radix-based `Collapse` namespace wrapper.
- [x] Replace the resource share history card toggles with the shared `Collapse` component.
- [x] Verify build passes and the share list still expands/collapses correctly.

## Review
- [ ] Confirm the share history cards use the shared `Collapse` wrapper without losing preview/download actions.
- [ ] Confirm the open/close transition remains smooth and the history list still scrolls normally.


## Device List Collapse Animation (2026-03-20)
- [x] Replace the device list accordion wrappers with shared `Collapse` animation.
- [x] Verify search filtering still works and the online/offline/group sections animate smoothly.

## Review
- [x] Confirm expanding/collapsing device groups now uses the shared animation path.
- [x] Confirm search filtering and scroll behavior were not regressed.


## Collapse Animation Refinement (2026-03-20)
- [x] Switch shared `Collapse` animation from height transition to Radix-style keyframes.
- [x] Verify build passes after the animation update.

## Review
- [x] Confirm the resource share list collapse now shows a visible open/close animation.
- [x] Confirm reduced-motion environments still behave acceptably.
- [x] Build verified with `npm run build`.


## Resource Share Subject Parameter (2026-03-20)
- [x] Add a subject input above the resource content editor with a type-aware default value.
- [x] Include the subject in outgoing text/image/file payloads and local share history entries.
- [x] Show the subject as the primary share record label with the device name as secondary text.
- [x] Verify the resource panel builds and the history header renders the new subject layout correctly.

## Review
- [ ] Confirm default subjects follow `设备名 + 的（文字、图片、文件）分享` for each content type.
- [ ] Confirm manual subject edits are preserved when switching between content types.
- [ ] Confirm old history entries still fall back to the sender name when no subject exists.

## Global Resource Message Receive (2026-03-20)
- [x] Confirm root cause: resource message listeners were mounted only in `ResourcePanel`, so switching tabs stopped subscriptions.
- [x] Add a global share message store to persist receive history and update download states.
- [x] Add a global share receiver hook mounted in `App` to subscribe to TCP/share download events.
- [x] Refactor `ResourcePanel` to consume global share state instead of owning transport listeners.
- [x] Verify `npm run build` passes and no TypeScript errors are introduced.

## Review
- [ ] Confirm switching away from the resource tab still receives text/image/file offers from other devices.
- [ ] Confirm returning to the resource tab shows messages received during other tabs.
- [ ] Confirm image/file download progress and completion status still update correctly.





