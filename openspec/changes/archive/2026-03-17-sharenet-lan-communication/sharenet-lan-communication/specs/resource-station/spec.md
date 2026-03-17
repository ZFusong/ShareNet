# Specification: resource-station

## ADDED Requirements

### Requirement: Send Panel
The system SHALL provide an interface for sending content to other devices.

#### Scenario: Text Sending
- **WHEN** user enters text and clicks Send
- **THEN** text SHALL be sent to selected devices

#### Scenario: Image Sending - Drag Drop
- **WHEN** user drags an image to the dropzone
- **THEN** the image SHALL be loaded for sending

#### Scenario: Image Sending - Paste
- **WHEN** user pastes an image (Ctrl+V)
- **THEN** the image SHALL be loaded for sending

#### Scenario: Image Sending - File Select
- **WHEN** user clicks to select an image file
- **THEN** the file browser SHALL open

#### Scenario: Image Compression Options
- **WHEN** user selects compression level
- **THEN** the image SHALL be compressed accordingly before sending

#### Scenario: File Sending
- **WHEN** user selects files and clicks Send
- **THEN** files SHALL be sent to selected devices

#### Scenario: Show File Size
- **WHEN** file is selected
- **THEN** the file size SHALL be displayed

#### Scenario: Broadcast Mode
- **WHEN** user selects broadcast
- **THEN** content SHALL be sent to all online devices

#### Scenario: Multi-Device Send
- **WHEN** user selects specific devices
- **THEN** content SHALL be sent only to selected devices

### Requirement: Receive Panel
The system SHALL display received content in a list.

#### Scenario: Receive Message
- **WHEN** content is received
- **THEN** it SHALL appear at the top of the receive list

#### Scenario: Show Message Metadata
- **WHEN** message is displayed
- **THEN** sender, type, time, and size SHALL be shown

#### Scenario: Text Preview
- **WHEN** text message is received
- **THEN** it SHALL be expandable for full view

#### Scenario: Copy Text
- **WHEN** user clicks copy on text
- **THEN** content SHALL be copied to clipboard

#### Scenario: Image Thumbnail
- **WHEN** image is received
- **THEN** a thumbnail SHALL be displayed in the list

#### Scenario: View Full Image
- **WHEN** user clicks on image thumbnail
- **THEN** the full-size image SHALL be displayed

#### Scenario: Save Image
- **WHEN** user clicks save on image
- **THEN** image SHALL be saved to user-selected location

#### Scenario: Copy Image
- **WHEN** user clicks copy on image
- **THEN** image SHALL be copied to clipboard

#### Scenario: File Download
- **WHEN** user clicks download on file
- **THEN** file SHALL be saved to user-selected location

#### Scenario: Show Download Progress
- **WHEN** file is downloading
- **THEN** progress SHALL be displayed

### Requirement: Storage Management
The system SHALL manage received files.

#### Scenario: Default Storage Path
- **WHEN** file is received
- **THEN** it SHALL be saved to userData/received/

#### Scenario: Clean History
- **WHEN** user clicks clean
- **THEN** received history SHALL be cleared

### Requirement: Transfer Mechanism
The system SHALL handle file transfer reliably.

#### Scenario: Small File Transfer
- **WHEN** file is under 10MB
- **THEN** it SHALL be transferred in memory

#### Scenario: Large File Transfer
- **WHEN** file is 10MB or larger
- **THEN** it SHALL be transferred in 1MB chunks

#### Scenario: Transfer Queue
- **WHEN** multiple files are transferring
- **THEN** maximum 3 files SHALL transfer concurrently