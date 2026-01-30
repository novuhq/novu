# Translation Capability

AI-powered translation for notification content in ReNovu.

## ADDED Requirements

### Requirement: Translation Settings Management

The system SHALL allow organizations to configure translation settings including OpenAI API key, model selection, and target locales.

#### Scenario: Configure OpenAI API Key
- **WHEN** organization admin provides an OpenAI API key
- **THEN** the key SHALL be encrypted with AES-256 and stored in `translation_settings` collection
- **AND** the key SHALL be associated with the organization ID

#### Scenario: Select Translation Model
- **WHEN** organization admin selects a translation model
- **THEN** the system SHALL store the model preference (gpt-4o-mini, gpt-4o, or gpt-4-turbo)
- **AND** default to gpt-4o-mini if not specified

#### Scenario: Configure Target Locales
- **WHEN** organization admin configures target locales
- **THEN** the system SHALL store the list of target locales for automatic translation
- **AND** store the default source locale

#### Scenario: Test API Connection
- **WHEN** organization admin clicks "Test Connection"
- **THEN** the system SHALL validate the API key by making a test call to OpenAI
- **AND** return success or detailed error message

### Requirement: Workflow Translation Management

The system SHALL support enabling, disabling, and managing translations for notification workflows.

#### Scenario: Enable Translation on Workflow
- **WHEN** user enables translation on a workflow
- **THEN** the system SHALL create a LocalizationGroup linked to the workflow
- **AND** queue automatic translation jobs for all configured target locales

#### Scenario: Disable Translation on Workflow
- **WHEN** user disables translation on a workflow
- **THEN** the system SHALL soft-disable the LocalizationGroup
- **AND** preserve existing translations for potential re-enable

#### Scenario: Delete Workflow with Translations
- **WHEN** a workflow with translations is deleted
- **THEN** the system SHALL delete the associated LocalizationGroup
- **AND** delete all child Localization records

### Requirement: Layout Translation Management

The system SHALL support enabling, disabling, and managing translations for notification layouts.

#### Scenario: Enable Translation on Layout
- **WHEN** user enables translation on a layout
- **THEN** the system SHALL create a LocalizationGroup linked to the layout
- **AND** queue automatic translation jobs for all configured target locales

#### Scenario: Disable Translation on Layout
- **WHEN** user disables translation on a layout
- **THEN** the system SHALL soft-disable the LocalizationGroup
- **AND** preserve existing translations for potential re-enable

#### Scenario: Delete Layout with Translations
- **WHEN** a layout with translations is deleted
- **THEN** the system SHALL delete the associated LocalizationGroup
- **AND** delete all child Localization records

### Requirement: AI-Powered Automatic Translation

The system SHALL provide AI-powered automatic translation using OpenAI API.

#### Scenario: Translate Plain Text Content
- **WHEN** system translates plain text notification content
- **THEN** the system SHALL tokenize variables ({{var}} → [VAR_X])
- **AND** send content to OpenAI for translation
- **AND** restore variables in translated output
- **AND** validate all tokens were preserved

#### Scenario: Translate HTML Content
- **WHEN** system translates HTML notification content (email body)
- **THEN** the system SHALL preserve all HTML tags and attributes
- **AND** only translate visible text content
- **AND** validate HTML structure is maintained

#### Scenario: Handle Translation Variables
- **WHEN** content contains template variables like {{user.name}}
- **THEN** the system SHALL replace variables with [VAR_X] tokens before translation
- **AND** restore original variables after translation
- **AND** fail validation if any tokens are not restored

#### Scenario: Batch Translation
- **WHEN** user triggers translation for multiple locales
- **THEN** the system SHALL queue translation jobs for each locale
- **AND** process jobs via background worker
- **AND** report progress as each locale completes

### Requirement: Translation Validation

The system SHALL validate translated content before storing.

#### Scenario: Validate Variable Preservation
- **WHEN** translation is completed
- **THEN** the system SHALL verify all [VAR_X] tokens were restored to original variables
- **AND** reject translation if tokens are missing

#### Scenario: Validate HTML Integrity
- **WHEN** HTML content is translated
- **THEN** the system SHALL verify HTML tag count matches (within tolerance of 2)
- **AND** verify no broken tags exist (unclosed < without >)
- **AND** warn if content is suspiciously shorter than original

#### Scenario: Handle Validation Failure
- **WHEN** translation validation fails
- **THEN** the system SHALL retry once with stricter prompt
- **AND** if still fails, mark locale as "needs manual review"
- **AND** store failed translation with warning flag

### Requirement: Translation Error Handling

The system SHALL handle translation failures gracefully.

#### Scenario: API Timeout or Rate Limit
- **WHEN** OpenAI API times out or returns rate limit error
- **THEN** the system SHALL retry with exponential backoff (up to 3 attempts)
- **AND** if all retries fail, mark job as failed and notify user

#### Scenario: Invalid API Key
- **WHEN** OpenAI returns authentication error
- **THEN** the system SHALL mark organization settings as invalid
- **AND** surface error in dashboard settings page
- **AND** pause all pending translation jobs for the organization

#### Scenario: Partial Batch Failure
- **WHEN** some locales translate successfully but others fail
- **THEN** the system SHALL save successful translations
- **AND** queue retry for failed locales
- **AND** report partial completion status

### Requirement: Translation Synchronization

The system SHALL support synchronizing translations across environments and resources.

#### Scenario: Publish Translations to Environment
- **WHEN** user publishes workflow/layout to another environment
- **THEN** the system SHALL copy LocalizationGroup to target environment
- **AND** copy all child Localization records

#### Scenario: Duplicate Resource with Translations
- **WHEN** user duplicates a workflow/layout with translations
- **THEN** the system SHALL create new LocalizationGroup for duplicated resource
- **AND** clone all Localization records to new group

### Requirement: Dashboard Translation Settings

The system SHALL provide a dedicated Translation Settings page in the dashboard.

#### Scenario: Access Translation Settings
- **WHEN** user navigates to Settings → Translation
- **THEN** the system SHALL display OpenAI configuration form
- **AND** display locale configuration
- **AND** show current configuration status

#### Scenario: Enable Translation Feature
- **WHEN** organization has valid OpenAI API key configured
- **THEN** translation features SHALL be enabled throughout the dashboard
- **AND** workflow/layout editors SHALL show translation toggles

#### Scenario: Translation Feature Disabled
- **WHEN** organization has no OpenAI API key configured
- **THEN** translation toggles SHALL be disabled with configuration prompt
- **AND** link to Settings → Translation SHALL be provided

### Requirement: Content Scope for Translation

The system SHALL only translate user-facing notification content.

#### Scenario: Translatable Content
- **WHEN** extracting content for translation
- **THEN** the system SHALL include: email subject, email body, email preheader, SMS body, push title, push body, in-app subject, in-app body, in-app action buttons, chat body

#### Scenario: Non-Translatable Content
- **WHEN** extracting content for translation
- **THEN** the system SHALL exclude: variable placeholders ({{...}}), workflow/step names, step identifiers/slugs, technical configuration, HTML tags and attributes
