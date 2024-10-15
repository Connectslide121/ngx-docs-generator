# ReportsComponent

## Description

The `ReportsComponent` is responsible for displaying and managing reports in an Angular application. It handles user authentication, manages report generation processes based on selected modules and processes, and displays relevant data sections. The component is located at `components/reports/reports.component.ts`.

## Selector

`<app-reports>`

## Inputs

- **selectedModule**: `Module | undefined` - Represents the currently selected module.
- **selectedProcess**: `Process | undefined` - Represents the currently selected process.
- **user**: `AccountInfo | null` - Holds the information of the authenticated user.
- **userRole**: `string` - Describes the role of the user (e.g., 'customer', 'auditor', 'verifier').
- **dataSections**: `DataSection[]` - Holds the associated data sections for the selected module.
- **selfDeclarationObject**: `DataPointWithEntry[]` - Contains self-declaration data points.
- **isSelfDeclarationReady**: `boolean` - Indicates if the self-declaration process is ready.
- **isAuditorPreliminaryReportReady**: `boolean` - Indicates if the auditor preliminary report is ready.
- **isAuditorFinalReportReady**: `boolean` - Indicates if the auditor final report is ready.
- **isVerifierStatementReady**: `boolean` - Indicates if the verifier statement is ready.

## Outputs

- **isMissingDataModalOpen**: `boolean` - Controls the visibility of the missing data modal.
- **missingDataMessage**: `string` - Displays messages about missing data requirements.

## Methods

- **ngOnInit()**: Initializes the component and subscribes to necessary services and data streams.
- **ngOnDestroy()**: Cleans up and unsubscribes from services when the component is destroyed.
- **getSelfDeclarationLink()**: Returns the URL for the self-declaration page based on the current route.
- **setUserRole()**: Determines the role of the user based on the selected process.
- **setReportsStatuses()**: Updates the readiness status of various reports based on the selected process.
- **fetchData()**: Fetches data sections, self-declaration objects, and verifier report data in parallel.
- **createCustomerReport()**: Initiates the creation of a customer report and opens the generated file.
- **createAuditorPreliminaryReport()**: Initiates the creation of an auditor preliminary report and opens the generated file.
- **createAuditorFinalReport()**: Initiates the creation of an auditor final report and opens the generated file.
- **createVerifierStatement()**: Generates a verifier statement report and checks for missing data before proceeding.
- **checkForMissingData()**: Validates if any required data is missing and prepares a message for users.
- **closeMissingDataModal()**: Closes the modal that displays missing data alerts.

## Usage Example

```javascript
<app-reports></app-reports>
```