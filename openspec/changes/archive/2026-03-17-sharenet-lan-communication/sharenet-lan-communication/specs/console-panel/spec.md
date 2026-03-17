# Specification: console-panel

## ADDED Requirements

### Requirement: Device Selection Area
The system SHALL provide a device selection interface.

#### Scenario: Display Device List
- **WHEN** console panel is shown
- **THEN** discovered devices SHALL be displayed in a list

#### Scenario: Batch Selection
- **WHEN** user selects multiple devices
- **THEN** all selected devices SHALL be highlighted

#### Scenario: Show Selection Count
- **WHEN** devices are selected
- **THEN** the count SHALL be displayed (e.g., "3 devices selected")

### Requirement: Command Composition Area
The system SHALL provide an interface for composing commands.

#### Scenario: Scene Selection
- **WHEN** user opens scene dropdown
- **THEN** available scenes from local config SHALL be listed

#### Scenario: Show Scene Steps
- **WHEN** a scene is selected
- **THEN** the steps SHALL be displayed in a preview panel

#### Scenario: Quick Software Action
- **WHEN** user selects a software preset
- **THEN** it SHALL be available for immediate sending

#### Scenario: Quick Input Action
- **WHEN** user selects an input preset
- **THEN** it SHALL be available for immediate sending

#### Scenario: Temporary Adjustment
- **WHEN** user adjusts a step for one-time execution
- **THEN** the changes SHALL apply only to current execution

### Requirement: Execution Control
The system SHALL provide execution timing options.

#### Scenario: Immediate Execution
- **WHEN** user clicks "Execute Now"
- **THEN** command SHALL be sent and executed immediately

#### Scenario: Scheduled Execution
- **WHEN** user sets a future time
- **THEN** command SHALL be sent at the specified time

#### Scenario: Send Only
- **WHEN** user selects "Send Only" mode
- **THEN** command SHALL be sent but not executed until recipient confirms

### Requirement: Execution Log
The system SHALL display real-time execution status.

#### Scenario: Show Send Status
- **WHEN** command is sent
- **THEN** it SHALL appear in the log with "sent" status

#### Scenario: Show Acknowledgment
- **WHEN** recipient acknowledges
- **THEN** log SHALL show "acknowledged" status

#### Scenario: Show Progress
- **WHEN** execution is in progress
- **THEN** log SHALL show current step and progress

#### Scenario: Show Completion
- **WHEN** execution completes
- **THEN** log SHALL show "completed" or "failed" with details