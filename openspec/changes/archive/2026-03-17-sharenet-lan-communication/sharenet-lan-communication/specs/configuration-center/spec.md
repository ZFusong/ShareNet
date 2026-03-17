# Specification: configuration-center

## ADDED Requirements

### Requirement: Configuration Storage
The system SHALL store configurations using electron-store.

#### Scenario: Default Storage Location
- **WHEN** application runs for the first time
- **THEN** config files SHALL be created in userData/config/

#### Scenario: Settings File
- **WHEN** settings are saved
- **THEN** they SHALL be persisted to settings.json

### Requirement: Software Presets CRUD
The system SHALL provide create, read, update, delete operations for software presets.

#### Scenario: Create Preset
- **WHEN** user fills in preset form and clicks Save
- **THEN** a new preset SHALL be created with unique ID

#### Scenario: Read Presets
- **WHEN** user opens configuration center
- **THEN** all software presets SHALL be loaded and displayed

#### Scenario: Update Preset
- **WHEN** user modifies preset and clicks Save
- **THEN** the preset SHALL be updated in storage

#### Scenario: Delete Preset
- **WHEN** user clicks Delete on a preset
- **THEN** the preset SHALL be removed from storage

### Requirement: Input Presets CRUD
The system SHALL provide create, read, update, delete operations for input (keyboard/mouse) presets.

#### Scenario: Create Input Preset
- **WHEN** user saves recorded actions as preset
- **THEN** a new input preset SHALL be created

### Requirement: Scene CRUD
The system SHALL provide create, read, update, delete operations for scene编排.

#### Scenario: Create Scene
- **WHEN** user creates a scene with steps
- **THEN** the scene SHALL be saved with sequential steps

#### Scenario: Drag Reorder
- **WHEN** user drags a step to a new position
- **THEN** the step order SHALL be updated

### Requirement: Export Configuration
The system SHALL export selected configurations to .lccfg file.

#### Scenario: Export with Module Selection
- **WHEN** user selects modules and clicks Export
- **THEN** a .lccfg file SHALL be generated

#### Scenario: Export File Format
- **WHEN** export completes
- **THEN** the file SHALL contain exportMeta and data sections

### Requirement: Import Configuration
The system SHALL import configurations from .lccfg file.

#### Scenario: Import File Parse
- **WHEN** user selects a .lccfg file
- **THEN** the file SHALL be parsed and preview shown

#### Scenario: Append Import Mode
- **WHEN** import mode is "append" and conflict exists
- **THEN** conflicting items SHALL be renamed with "-1" suffix

#### Scenario: Overwrite Import Mode
- **WHEN** import mode is "overwrite" and conflict exists
- **THEN** conflicting items SHALL be replaced

#### Scenario: Conflict Detection
- **WHEN** importing with existing items
- **THEN** ID and name conflicts SHALL be detected and reported

#### Scenario: Dependency Check
- **WHEN** importing scenes
- **THEN** referenced presets SHALL be checked for existence

### Requirement: Import Result Report
The system SHALL display import results after completion.

#### Scenario: Show Import Summary
- **WHEN** import completes
- **THEN** success/failure/skip counts SHALL be displayed