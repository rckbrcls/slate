# Security Policy

## Reporting a Vulnerability

Please do not open public issues for security vulnerabilities.

Report vulnerabilities privately to:

- Email: TODO

## Supported Versions

| Version | Supported |
| ------- | --------- |
| main    | Yes       |

## Security Considerations

Slate is a desktop screenplay editor with local file-system integration, project browsing, file watching, and Tauri packaging.

Review these areas carefully:

- Tauri permissions and file-system access boundaries.
- Project folder selection and file watching behavior.
- Handling of user-created screenplay files and exported documents.
- Any future local AI-assisted editing or command execution.

## Secrets

This project should not require committed secrets. Keep local configuration files out of source control.
