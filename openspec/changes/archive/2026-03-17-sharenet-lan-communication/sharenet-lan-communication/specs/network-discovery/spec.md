# Specification: network-discovery

## ADDED Requirements

### Requirement: UDP Broadcast Service
The system SHALL provide a UDP broadcast service for device discovery on the local network.

#### Scenario: Start UDP Service
- **WHEN** the application starts with default configuration
- **THEN** the system SHALL bind to UDP port 8888 and begin broadcasting

#### Scenario: Custom UDP Port
- **WHEN** user configures a custom UDP port in settings
- **THEN** the system SHALL bind to the specified port and use it for discovery

### Requirement: Device Information Broadcasting
The system SHALL periodically broadcast device information to all peers on the network.

#### Scenario: Broadcast Contains Required Fields
- **WHEN** a broadcast message is sent
- **THEN** it SHALL include: deviceName, ip, tcpPort, role (master/slave/both), tags

#### Scenario: Broadcast Interval
- **WHEN** the system is running
- **THEN** it SHALL broadcast device info every 5 seconds (configurable)

### Requirement: Device List Maintenance
The system SHALL maintain a list of discovered devices with real-time status updates.

#### Scenario: New Device Discovery
- **WHEN** a new device broadcasts its information
- **THEN** the device SHALL be added to the device list within 5 seconds

#### Scenario: Device Update
- **WHEN** an existing device broadcasts again
- **THEN** the device info SHALL be updated and lastSeen timestamp refreshed

#### Scenario: Device Offline Detection
- **WHEN** no broadcast received from a device for 15 seconds
- **THEN** the device SHALL be marked as offline

### Requirement: Manual Device Addition
The system SHALL allow manual addition of devices by IP address as a fallback.

#### Scenario: Add Device by IP
- **WHEN** user enters a valid IP address and clicks "Add"
- **THEN** the system SHALL attempt to connect and add the device to the list

### Requirement: Heartbeat Mechanism
The system SHALL implement a heartbeat mechanism to maintain device online status.

#### Scenario: Send Heartbeat
- **WHEN** device is connected
- **THEN** it SHALL send heartbeat messages every 5 seconds

#### Scenario: Receive Heartbeat
- **WHEN** heartbeat is received from a known device
- **THEN** the device's lastSeen time SHALL be updated and status set to online