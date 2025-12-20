
# Contributing to HSE Guardian

Thank you for your interest in improving the Incident Image Taking System. As a safety-critical application, we maintain high standards for code quality and integrity.

## Development Workflow

1.  **Fork & Clone**: Create a personal branch from `main`.
2.  **Environment**: Copy `.env.example` to `.env` and configure your testing keys.
3.  **Security**: Ensure all biometric and OAuth flows are tested in a secure context (HTTPS or localhost).
4.  **Testing**: Verify that image compression is functional and offline sync handles IndexedDB transactions correctly.
5.  **Pull Requests**: Provide clear descriptions of changes and ensure the GitHub Actions build passes.

## Coding Standards

-   Use TypeScript for all new components.
-   Adhere to the established Tailwind CSS design system.
-   Maintain accessibility (ARIA) for field safety users.
-   Prioritize offline-first functionality.

Safety first.
