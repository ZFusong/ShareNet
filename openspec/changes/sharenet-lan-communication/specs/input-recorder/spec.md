# Specification: input-recorder

## ADDED Requirements

### Requirement: Recording UI
The system SHALL provide a recording interface in a dialog/popup.

#### Scenario: Open Recorder
- **WHEN** user clicks "Record" button
- **THEN** a recording dialog SHALL open

### Requirement: Recording Control
The system SHALL provide start/pause/stop recording controls.

#### Scenario: Start Recording
- **WHEN** user clicks Start
- **THEN** keyboard and mouse events SHALL begin being captured

#### Scenario: Pause Recording
- **WHEN** user clicks Pause during recording
- **THEN** events SHALL continue to be captured but not recorded

#### Scenario: Resume Recording
- **WHEN** user clicks Resume after pause
- **THEN** event capturing SHALL resume

#### Scenario: Stop Recording
- **WHEN** user clicks Stop
- **THEN** all captured events SHALL be saved and displayed as steps

### Requirement: Global Hotkey
The system SHALL support global hotkey to trigger recording.

#### Scenario: Hotkey Trigger
- **WHEN** global hotkey is pressed (e.g., Ctrl+Shift+R)
- **THEN** recording SHALL start/stop

### Requirement: Keyboard Recording
The system SHALL capture keyboard input during recording.

#### Scenario: Record Key Press
- **WHEN** a key is pressed during recording
- **THEN** the key SHALL be recorded with timestamp

#### Scenario: Record Key Release
- **WHEN** a key is released during recording
- **THEN** the release SHALL be recorded

#### Scenario: Record Key Combo
- **WHEN** multiple keys are pressed together
- **THEN** they SHALL be recorded as a combo

### Requirement: Mouse Recording
The system SHALL capture mouse actions during recording.

#### Scenario: Record Mouse Click
- **WHEN** mouse is clicked during recording
- **THEN** the click (button, position) SHALL be recorded

#### Scenario: Record Mouse Move
- **WHEN** mouse moves during recording
- **THEN** the movement path MAY be recorded as waypoints

#### Scenario: Record Mouse Wheel
- **WHEN** mouse wheel is scrolled during recording
- **THEN** the scroll direction and amount SHALL be recorded

### Requirement: Time Interval Recording
The system SHALL record time intervals between actions.

#### Scenario: Generate Delay Steps
- **WHEN** time between actions exceeds 100ms
- **THEN** a delay step SHALL be automatically generated

### Requirement: Step Display
The system SHALL display recorded steps in a list.

#### Scenario: Show Step List
- **WHEN** recording completes
- **THEN** all steps SHALL be displayed with type, summary, and delay

### Requirement: Step Editing
The system SHALL allow editing of recorded steps.

#### Scenario: Edit Step
- **WHEN** user modifies a step
- **THEN** the changes SHALL be saved

#### Scenario: Delete Step
- **WHEN** user deletes a step
- **THEN** the step SHALL be removed from the list

#### Scenario: Add Step Manually
- **WHEN** user adds a new step
- **THEN** it SHALL be inserted into the step list

### Requirement: Preview Playback
The system SHALL allow previewing the recorded actions locally.

#### Scenario: Preview Recording
- **WHEN** user clicks Preview
- **THEN** actions SHALL be executed on the local machine

### Requirement: Save as Preset
The system SHALL save recorded actions as an input preset.

#### Scenario: Save Recording
- **WHEN** user enters a name and clicks Save
- **THEN** the recording SHALL be saved as an input preset