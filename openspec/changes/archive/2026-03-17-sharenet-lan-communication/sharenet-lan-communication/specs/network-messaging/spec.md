# Specification: network-messaging

## ADDED Requirements

### Requirement: TCP Server
The system SHALL provide a TCP server for reliable message transmission.

#### Scenario: Start TCP Server
- **WHEN** the application starts
- **THEN** the system SHALL bind to TCP port 8889 and listen for connections

#### Scenario: Custom TCP Port
- **WHEN** user configures a custom TCP port in settings
- **THEN** the system SHALL bind to the specified port

### Requirement: Message Protocol
The system SHALL implement a JSON-based message protocol for all communications.

#### Scenario: Message Format
- **WHEN** any message is sent
- **THEN** it SHALL contain: msg_type, sender, payload, timestamp, request_id

#### Scenario: Supported Message Types
- **WHEN** a message is received
- **THEN** it SHALL support types: DISCOVERY, COMMAND, SHARE_TEXT, SHARE_IMAGE, SHARE_FILE, HEARTBEAT, ACK

### Requirement: Message Sending
The system SHALL provide functionality to send messages to discovered devices.

#### Scenario: Send to Single Device
- **WHEN** user selects a target device and sends a message
- **THEN** the message SHALL be delivered via TCP connection

#### Scenario: Broadcast Message
- **WHEN** user selects broadcast mode
- **THEN** the message SHALL be sent to all online devices

### Requirement: ACK Confirmation
The system SHALL implement acknowledgment mechanism for reliable delivery.

#### Scenario: Receive Message
- **WHEN** a message is received
- **THEN** an ACK message SHALL be sent back to the sender

#### Scenario: Timeout Handling
- **WHEN** ACK is not received within 10 seconds
- **THEN** the message SHALL be considered failed and user notified

### Requirement: File Transfer
The system SHALL support reliable file transfer with chunking.

#### Scenario: Chunk Size
- **WHEN** a file is transferred
- **THEN** it SHALL be divided into 1MB chunks

#### Scenario: Resume Transfer
- **WHEN** a file transfer is interrupted
- **THEN** the receiver SHALL support resuming from the last received chunk

#### Scenario: MD5 Verification
- **WHEN** file transfer completes
- **THEN** MD5 checksum SHALL be verified to ensure integrity