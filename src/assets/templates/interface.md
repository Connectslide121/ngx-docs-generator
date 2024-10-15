# DataEntry

## Description

This interface represents a data entry model located at `models/dataEntry.ts`. It defines the structure and types for a data entry, including optional fields and nested objects like `User`, `Comment`, and `Attachment`.

## Properties

- **id**: `string` (optional) - Unique identifier for the data entry.
- **dataPointId**: `string` - Identifier for the specific data point this entry corresponds to.
- **processId**: `string` - Identifier for the associated process.
- **organizationId**: `string` - Identifier for the organization related to this entry.
- **dataSetId**: `string` - Identifier for the dataset.
- **dataSectionId**: `string` - Identifier for the data section.
- **status**: `string` (optional) - Current status of the data entry.
- **userId**: `string` (optional) - Identifier for the user associated with this entry.
- **assignedTo**: `User` (optional) - User object representing who this data entry is assigned to.
- **attachments**: `Attachment[]` (optional) - Array of attachments related to this data entry.
- **entryValue**: `string` (optional) - The actual value of the entry.
- **entryType**: `string` - Type of the entry.
- **modified**: `Date` (optional) - Date when the entry was last modified.
- **comments**: `Comment[]` (optional) - Array of comments associated with this entry.
- **history**: `HistoryEntry[]` (optional) - Array of history entries that track changes to this data entry.

## Usage Example

```javascript
const exampleDataEntry: DataEntry = {
  dataPointId: "dp-123",
  processId: "proc-456",
  organizationId: "org-789",
  dataSetId: "ds-012",
  dataSectionId: "section-345",
  entryType: "text",
  entryValue: "Sample value",
  modified: new Date(),
  assignedTo: { id: "user-001", name: "John Doe" },
  attachments: [
    {
      id: "att-001",
      filename: "document.pdf",
      uniqueFilename: "doc_001.pdf",
      url: "http://example.com/doc_001.pdf"
    }
  ],
  comments: [
    { userId: "user-001", content: "This is a comment." }
  ],
  history: [
    {
      value: "Initial entry",
      date: new Date(),
      userId: "user-002",
      isModified: false
    }
  ]
};
```