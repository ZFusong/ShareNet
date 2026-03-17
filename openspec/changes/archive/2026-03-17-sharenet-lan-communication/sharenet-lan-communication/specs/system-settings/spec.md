# Specification: system-settings

## ADDED Requirements

### Requirement: Local Device Information
The system SHALL provide settings for local device identity.

#### Scenario: Set Device Name
- **WHEN** user enters device name and saves
- **THEN** the name SHALL be used in broadcasts

#### Scenario: Set Device Role
- **WHEN** user selects role (master/slave/both)
- **THEN** the role SHALL be used in broadcasts

#### Scenario: Set Device Tags
- **WHEN** user enters tags (comma-separated)
- **THEN** tags SHALL be used in broadcasts and filtering

### Requirement: Network Settings
The system SHALL provide network configuration options.

#### Scenario: Set UDP Port
- **WHEN** user enters UDP port and saves
- **THEN** the service SHALL restart with new port

#### Scenario: Set TCP Port
- **WHEN** user enters TCP port and saves
- **THEN** the service SHALL restart with new port

#### Scenario: Set Broadcast Interval
- **WHEN** user enters broadcast interval (ms) and saves
- **THEN** broadcasts SHALL use the new interval

### Requirement: Security Settings
The system SHALL provide security configuration.

#### Scenario: Toggle Allow Control
- **WHEN** user enables "allow control"
- **THEN** remote commands SHALL be accepted

#### Scenario: Toggle Allow Control
- **WHEN** user disables "allow control"
- **THEN** remote commands SHALL be rejected

#### Scenario: Set IP Whitelist
- **WHEN** user configures IP whitelist
- **THEN** only listed IPs SHALL be allowed to control

#### Scenario: Toggle Confirm Mode
- **WHEN** confirm mode is enabled
- **THEN** sensitive operations SHALL require user confirmation

### Requirement: Log Management
The system SHALL provide log viewing and management.

#### Scenario: View Runtime Logs
- **WHEN** user clicks "View Logs"
- **THEN** recent log entries SHALL be displayed

#### Scenario: Filter by Level
- **WHEN** user selects log level filter
- **THEN** only logs of that level SHALL be shown

#### Scenario: Open Config Directory
- **WHEN** user clicks "Open Config Directory"
- **THEN** the config folder SHALL be opened in file explorer

#### Scenario: Set Log Level
- **WHEN** user selects log level
- **THEN** new log entries SHALL use the selected level

### Requirement: Settings Persistence
The system SHALL save and load settings correctly.

#### Scenario: Save Settings
- **WHEN** user clicks Save
- **THEN** all settings SHALL be persisted to electron-store

#### Scenario: Load Settings
- **WHEN** application starts
- **THEN** saved settings SHALL be loaded and applied