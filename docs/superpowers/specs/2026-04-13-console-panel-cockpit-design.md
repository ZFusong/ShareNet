# Console Panel Cockpit Redesign

- Date: 2026-04-13
- Scope: Desktop-only redesign for the renderer console panel (`操作台`)
- Status: Approved in conversation, pending user review of written spec

## 1. Goal

Redesign the console panel from a vertically stacked form into a desktop cockpit-style control surface that prioritizes:

1. Information hierarchy first
2. Faster operation flow second
3. Stronger visual polish third

The page should feel like a display-oriented control cockpit, but the design must remain readable and operationally clear. Visual impact cannot come at the cost of task comprehension.

## 2. Current Problems

The current console panel groups "target device selection", "triggerKey input", and "execution log" in a mostly linear stack. This creates three issues:

1. The page lacks a strong reading order, so users do not immediately know what matters most.
2. The send flow is functional but visually weak; users must scan and interpret too much before acting.
3. The log area is demoted to a bottom section, so feedback is easy to miss after sending.

The redesign should solve those problems without changing the console panel's core business behavior.

## 3. Non-Goals

This redesign does not:

1. Change the underlying send semantics. The console panel still only sends `triggerKey`.
2. Add mobile or tablet layout requirements. This spec is desktop-only.
3. Rework the device list module's core logic.
4. Introduce new backend behavior, new network behavior, or new trigger execution rules.

## 4. Core Design Principle

The page must always communicate state in this order:

1. What am I controlling right now?
2. What am I about to send?
3. What did the system do?

Every layout and styling choice should reinforce that sequence.

## 5. Proposed Layout

The console panel should be rebuilt into a three-part desktop cockpit layout.

### 5.1 Top Overview Rail

A horizontal overview rail appears at the top of the page and contains four compact status cards:

1. `Target Mode`
   Shows whether the current mode is "selected devices" or "device group".
2. `Resolved Target Count`
   Shows how many devices will receive the current trigger, plus group source when relevant.
3. `Current TriggerKey`
   Shows the current input value or a clear empty-state message.
4. `Latest Send Result`
   Shows the most recent send result summary and time.

This rail provides orientation only. It is not the place for detailed editing controls.

### 5.2 Main Operation Zone

The center of the page is split into two large primary cards.

#### Left: Target Strategy Card

This card replaces the plain radio-group feel with two explicit mode cards:

1. `Selected Devices`
   Explains that targets come from the existing device list selection.
2. `Device Group`
   Explains that targets come from a named group and includes the group picker when active.

Each mode card must show:

1. Title
2. Short explanation
3. Current count or source summary
4. Strong selected state and restrained unselected state

If group mode is active, the group selector appears inside the same card and shows the chosen group's device count.

If selected-device mode is active, the card clearly states that it reflects the current device list selection so the source of truth is obvious.

#### Right: Trigger Send Card

This becomes the visual focal point of the page.

The internal structure is vertical:

1. Large `triggerKey` input field
2. Clickable common trigger suggestions
3. Primary send action area
4. Compact rule note explaining that the console sends only `triggerKey`

The send action area must include live context, such as:

- "Send to 6 devices"
- "Send to group: Studio A"

This avoids forcing users to mentally recompute the action target before clicking.

### 5.3 Right Feedback Column

The feedback side becomes a dedicated information loop instead of a bottom appendage.

#### Upper: Target Device Echo

This area shows the resolved device set as compact chips or mini-cards. It should support fast scanning:

1. Online devices are visually emphasized.
2. Offline or otherwise unavailable states are visibly subdued.
3. Device name and address remain readable.

The purpose is to confirm scope before sending and confirm reach after sending.

#### Lower: Execution Log

The log remains persistent but gains clearer hierarchy:

1. Success, error, and neutral states are visually distinct.
2. The title row owns the `Clear Log` secondary action.
3. The content remains easy to scan and can continue auto-scrolling as it does today.

The log should feel like the detailed record, not the primary source of user orientation.

## 6. Interaction Design

The intended primary user flow is:

1. Confirm target scope
2. Confirm or enter `triggerKey`
3. Send
4. Read immediate feedback

To support that flow, the panel should adopt the following rules.

### 6.1 Preemptive Blocking Feedback

When action is blocked, the interface should say so before the user clicks send.

Examples:

1. No resolved targets
2. Empty `triggerKey`

These warnings may still be logged after attempted send, but the page should surface them directly in the main action area so users understand the blocking condition earlier.

### 6.2 Trigger Suggestions Over Pure Dropdown Dependence

High-frequency trigger usage should be optimized for clicking rather than only selecting from a dropdown. The design should prefer visible suggestion chips or buttons for common trigger values and treat the dropdown as a secondary convenience path.

### 6.3 Feedback Summary Before Detail

After sending, users should first see an at-a-glance result summary in the feedback region and only then rely on the log for detailed per-entry history.

### 6.4 Action Hierarchy

`Send Trigger` is the only primary action in the panel.

`Clear Log` is demoted to a local secondary action in the log header. It should no longer visually compete with the main send control.

## 7. Visual Language

The panel should adopt a light cockpit aesthetic rather than a dark sci-fi theme.

### 7.1 Tone

1. Bright desktop workspace foundation
2. Card-based control surface
3. Strong typographic hierarchy
4. Restrained gradients and layered surfaces
5. Concentrated accent usage for important state and action

### 7.2 Styling Direction

The redesign should rely on:

1. Clear sectional separation
2. Stronger heading/value contrast
3. Selective glow or elevated treatment for the main action card
4. Better spacing rhythm and grouping

The redesign should avoid:

1. Full-page high-saturation effects
2. Excess decorative chrome that reduces clarity
3. Overusing accent colors on non-primary content

## 8. Content Hierarchy Rules

To preserve the "display cockpit" feel without harming usability:

1. Key numbers and state labels should be easier to spot than descriptive copy.
2. Descriptive copy should remain short and supportive.
3. Primary cards should read clearly even when scanned in under two seconds.
4. The feedback column must not become visually heavier than the action zone.

## 9. Implementation Boundaries

The redesign should be implemented with minimal behavioral risk:

1. Preserve existing target resolution behavior.
2. Preserve existing send behavior and log mechanics unless a small UI-facing refinement is required.
3. Keep changes focused on the console panel and closely related styling surfaces.
4. Reuse existing UI primitives where practical.

## 10. Validation Criteria

The redesign is successful if all of the following are true:

1. A user can identify current target mode, target scope, and current trigger value within a glance.
2. The primary action is visually obvious and context-rich.
3. Post-send feedback is visible without requiring the user to scan to the bottom of the page.
4. The desktop layout feels intentionally display-oriented, not like a lightly restyled form.
5. Existing console behavior still works correctly.

## 11. Risks And Controls

### Risk: Visual overdesign reduces usability

Control:
Use hierarchy, spacing, and restrained emphasis before adding decorative treatments.

### Risk: Layout changes introduce confusion about target source

Control:
Explicitly label whether the current source is device list selection or a device group.

### Risk: Feedback becomes too fragmented

Control:
Keep one dedicated feedback column with a clear summary-first, detail-second structure.

## 12. Open Decisions Resolved In Conversation

The following constraints were explicitly decided during brainstorming:

1. Optimize all three dimensions: hierarchy, efficiency, and visual polish.
2. Information hierarchy is the first priority.
3. The desired visual direction is a display-oriented cockpit.
4. Significant layout restructuring is allowed.
5. Only desktop layout needs to be considered in this design.
