## MODIFIED Requirements

### Requirement: Step Editing
The system SHALL allow editing of recorded steps.

#### Scenario: Edit Single Step
- **WHEN** user opens a recorded step from the context menu or the step editor
- **THEN** the system SHALL allow changing that step without rebuilding the whole recording

#### Scenario: Delete Step
- **WHEN** user deletes a step
- **THEN** the step SHALL be removed from the list

#### Scenario: Add Step Manually
- **WHEN** user adds a new step
- **THEN** it SHALL be inserted into the step list

### Requirement: Save as Preset
The system SHALL save recorded actions as an input preset.

#### Scenario: Save Keyboard Macro
- **WHEN** user enters a name and clicks Save
- **THEN** the recording SHALL be saved as an input preset containing only keyboard macro steps and compatible delays

#### Scenario: Exclude Mouse Actions
- **WHEN** the recorder output contains mouse actions
- **THEN** mouse actions SHALL not be persisted into the input preset payload

## ADDED Requirements

### Requirement: Recorder Context Menu
The system SHALL provide context-aware menu actions for recorded steps and empty list areas.

#### Scenario: Step Menu Actions
- **WHEN** user right-clicks a recorded step
- **THEN** the menu SHALL offer edit, insert before, insert after, duplicate, and delete actions scoped to that step

#### Scenario: Empty Area Actions
- **WHEN** user right-clicks the empty recorder list area
- **THEN** the menu SHALL offer insert delay and clear all actions scoped to the list

### Requirement: Recording Output Normalization
The system SHALL normalize recorder output so keyboard macros and mouse actions are separated into the right downstream targets.

#### Scenario: Keyboard Output
- **WHEN** the recording contains keyboard actions
- **THEN** the output SHALL preserve those actions as a keyboard macro sequence

#### Scenario: Mouse Output
- **WHEN** the recording contains mouse actions
- **THEN** the output SHALL preserve mouse step data for scene import and SHALL not mix mouse actions into the keyboard macro sequence

### Requirement: Recorder Step Preview
The system SHALL display recorded steps with summaries that reflect the normalized output.

#### Scenario: Show Normalized Summary
- **WHEN** recording completes
- **THEN** each step SHALL be shown with type, key details, mouse details, and delay information
