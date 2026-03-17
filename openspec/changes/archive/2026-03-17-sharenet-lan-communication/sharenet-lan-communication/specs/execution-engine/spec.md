# Specification: execution-engine

## ADDED Requirements

### Requirement: Command Reception
The system SHALL receive and parse commands from remote devices.

#### Scenario: Listen for Commands
- **WHEN** TCP server is running
- **THEN** it SHALL listen for COMMAND type messages

#### Scenario: Parse Command Type
- **WHEN** command is received
- **THEN** it SHALL be parsed as EXECUTE_SOFTWARE, EXECUTE_INPUT, or EXECUTE_SCENE

### Requirement: Permission Verification
The system SHALL verify sender permissions before execution.

#### Scenario: Control Allowed
- **WHEN** control is allowed and sender is whitelisted
- **THEN** the command SHALL be executed

#### Scenario: Control Disabled
- **WHEN** "allow control" is disabled
- **THEN** the command SHALL be rejected with error message

#### Scenario: Whitelist Check
- **WHEN** whitelist is configured and sender is not in whitelist
- **THEN** the command SHALL be rejected

### Requirement: Software Execution
The system SHALL execute software based on preset configuration.

#### Scenario: Execute by Name Match
- **WHEN** command contains software name
- **THEN** it SHALL match against local software-presets and launch

#### Scenario: Execute with Parameters
- **WHEN** preset contains arguments
- **THEN** the software SHALL be launched with specified arguments

#### Scenario: Execute with Working Directory
- **WHEN** preset contains workingDir
- **THEN** the software SHALL be launched from that directory

#### Scenario: Duplicate Launch Prevention
- **WHEN** software is already running
- **THEN** it SHALL not launch again and notify the sender

#### Scenario: Delayed Execution
- **WHEN** command specifies delay
- **THEN** execution SHALL be delayed by specified milliseconds

### Requirement: Input Simulation
The system SHALL simulate keyboard and mouse actions.

#### Scenario: Key Combo
- **WHEN** action type is keyCombo
- **THEN** multiple keys SHALL be pressed simultaneously

#### Scenario: Key Press
- **WHEN** action type is keyPress
- **THEN** a single key SHALL be pressed and released

#### Scenario: Mouse Click
- **WHEN** action type is mouseClick
- **THEN** mouse button SHALL be clicked at specified coordinates

#### Scenario: Mouse Move
- **WHEN** action type is mouseMove
- **THEN** mouse SHALL move to specified coordinates

#### Scenario: Text Input
- **WHEN** action type is textInput
- **THEN** text SHALL be typed at current cursor position

#### Scenario: Delay
- **WHEN** action type is delay
- **THEN** execution SHALL pause for specified milliseconds

### Requirement: Scene Execution
The system SHALL execute scene steps in sequence.

#### Scenario: Sequential Execution
- **WHEN** scene is executed
- **THEN** steps SHALL be executed one by one

#### Scenario: Step Delay
- **WHEN** step contains delay
- **THEN** execution SHALL pause between steps

#### Scenario: Continue on Error
- **WHEN** error occurs and continueOnError is true
- **THEN** execution SHALL proceed to next step

#### Scenario: Stop on Error
- **WHEN** error occurs and continueOnError is false
- **THEN** execution SHALL stop and report error

### Requirement: Execution Feedback
The system SHALL provide execution status feedback.

#### Scenario: Send Status
- **WHEN** execution status changes
- **THEN** status SHALL be sent back to the command sender

#### Scenario: Log Execution
- **WHEN** command is executed
- **THEN** it SHALL be logged with timestamp, source, command, and result