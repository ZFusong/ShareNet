## MODIFIED Requirements

### Requirement: Input Presets CRUD
The system SHALL provide create, read, update, delete operations for input keyboard macro presets.

#### Scenario: Save Keyboard Macro
- **WHEN** user saves recorder output that has been normalized to keyboard steps
- **THEN** a new input preset SHALL be created containing only keyboard macro steps and compatible delays

#### Scenario: Update Keyboard Macro
- **WHEN** user edits an input preset and clicks Save
- **THEN** the preset SHALL be updated with keyboard-only steps and any mouse-specific steps SHALL be dropped

#### Scenario: Read Input Presets
- **WHEN** user opens configuration center
- **THEN** input presets SHALL display as keyboard macro presets without mouse actions in their summaries

## ADDED Requirements

### Requirement: Scene Mouse Step Details
The system SHALL support editing and previewing detailed mouse steps in scenes.

#### Scenario: Create Mouse Click Step
- **WHEN** user adds or edits a mouse click step
- **THEN** the system SHALL allow configuring button, X, Y, and optional note fields

#### Scenario: Create Mouse Move Step
- **WHEN** user adds or edits a mouse move step
- **THEN** the system SHALL allow configuring X, Y, duration, and optional note fields

#### Scenario: Preview Mouse Step Summary
- **WHEN** user views a scene containing mouse steps
- **THEN** the scene summary SHALL show button, coordinates, duration, and pre-delay information in a readable form
