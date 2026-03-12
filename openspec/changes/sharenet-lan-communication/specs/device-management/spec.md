# Specification: device-management

## ADDED Requirements

### Requirement: Device Object Model
The system SHALL define a device object with all required properties.

#### Scenario: Device Properties
- **WHEN** a device is discovered
- **THEN** it SHALL have: deviceId, deviceName, ip, tcpPort, role, tags, status, lastSeen

#### Scenario: Device Status Values
- **WHEN** device status changes
- **THEN** status SHALL be one of: online, offline, busy

### Requirement: Device List Display
The system SHALL display discovered devices in a list format.

#### Scenario: Show Device Name
- **WHEN** device is displayed
- **THEN** the device name SHALL be prominently shown

#### Scenario: Show Device IP
- **WHEN** device is displayed
- **THEN** the IP address SHALL be shown below the name

#### Scenario: Show Device Role
- **WHEN** device is displayed
- **THEN** the role (master/slave/both) SHALL be displayed as a badge

#### Scenario: Show Device Status
- **WHEN** device is displayed
- **THEN** the online/offline status SHALL be indicated with a colored dot

### Requirement: Device Filtering
The system SHALL provide filtering options for the device list.

#### Scenario: Filter by Role
- **WHEN** user selects "master" filter
- **THEN** only devices with role "master" SHALL be shown

#### Scenario: Filter by Role
- **WHEN** user selects "slave" filter
- **THEN** only devices with role "slave" SHALL be shown

#### Scenario: Filter by Role
- **WHEN** user selects "both" filter
- **THEN** only devices with role "both" SHALL be shown

#### Scenario: Show All Devices
- **WHEN** user selects "all" filter
- **THEN** all devices SHALL be shown regardless of role

### Requirement: Device Selection
The system SHALL allow multi-select of devices for batch operations.

#### Scenario: Select Single Device
- **WHEN** user clicks on a device row
- **THEN** the device SHALL be selected/deselected

#### Scenario: Select All Devices
- **WHEN** user clicks "Select All" button
- **THEN** all visible devices SHALL be selected

#### Scenario: Deselect All
- **WHEN** user clicks "Deselect All" button
- **THEN** all devices SHALL be deselected

#### Scenario: Selected Count Display
- **WHEN** devices are selected
- **THEN** the count of selected devices SHALL be displayed

### Requirement: Device Refresh
The system SHALL provide a manual refresh option.

#### Scenario: Manual Refresh
- **WHEN** user clicks refresh button
- **THEN** the device list SHALL be immediately updated

### Requirement: Offline Device Caching
The system SHALL cache offline devices and display their last seen time.

#### Scenario: Show Last Seen
- **WHEN** a device goes offline
- **THEN** it SHALL remain in the list with "offline" status and lastSeen time

#### Scenario: Remove Offline After Extended Time
- **WHEN** device has been offline for more than 24 hours
- **THEN** it MAY be automatically removed from the list