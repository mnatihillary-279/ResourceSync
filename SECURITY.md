Security Policy

1. Overview

ResourceSync is an offline-first resource tracking application developed for the Zetech Forge Alumni × Student Hackathon 2026.

This document describes the application's current security measures, known limitations and responsible vulnerability-reporting practices.

2. Implemented Security Measures

The application currently includes:

- HTTP security headers: Helmet is used to apply security-related HTTP headers.
- Request validation: Zod is used to validate supported incoming data.
- Request size limits: Express JSON request bodies are limited to 100 KB.
- Environment configuration: Database connection details and configuration are supplied through environment variables.
- Secret exclusion: Environment files containing local configuration are excluded through ".gitignore".
- Database transactions: MongoDB transactions help maintain consistency across related synchronization operations.
- Duplicate-operation protection: Operation receipts are used to recognize previously processed synchronization operations.

These measures reduce certain risks but do not guarantee that the application is secure against every attack.

3. Known Security Limitations

The current implementation has the following limitations:

1. No authentication: Users are not required to authenticate before accessing the application.
2. No authorization: Role-based access control and permission enforcement are not implemented.
3. No organization isolation: The application does not currently isolate records between organizations or institutions.
4. No production access controls: Publicly accessible deployment could expose application data to unauthorized users.
5. Client-side data: IndexedDB data is stored locally in the user's browser and is not protected by application-level encryption.

The application must therefore be treated as a demonstration project.

Do not use real patient information, confidential institutional records, personal information or other sensitive production data.

4. Environment Variables and Secrets

- Keep "server/.env" out of version control.
- Use ".env.example" to document required configuration without including real credentials.
- Never commit database passwords, API keys, access tokens or other secrets.
- Use the hosting platform's environment-variable configuration for production credentials.
- Restrict database network access to trusted application infrastructure.

If a credential is accidentally committed, revoke or rotate it immediately. Removing it from the latest commit alone does not remove it from Git history.

5. Database Security

For local development:

- Bind the MongoDB service to localhost where possible.
- Use synthetic demonstration records.
- Do not expose an unsecured database port to public networks.

For production:

- Enable database authentication.
- Use a transaction-capable MongoDB deployment.
- Restrict database access through network controls.
- Use credentials with only the permissions required by the application.
- Protect database backups and connection strings.

6. Dependency Security

Dependencies should be reviewed regularly.

Run:

npm audit

Review reported vulnerabilities before applying dependency updates.

Do not apply forced dependency upgrades without checking compatibility and rerunning the application's automated tests and production build.

7. Responsible Vulnerability Reporting

If a security vulnerability is identified:

1. Do not exploit it against systems or data belonging to other people.
2. Avoid publishing sensitive credentials or private information.
3. Document the affected component and the steps needed to reproduce the issue.
4. Report the issue privately to the project maintainers.

8. Security Status

ResourceSync is currently intended for controlled demonstration and evaluation.

Authentication, authorization, organization-level data isolation and additional production security controls remain future requirements before handling real institutional or sensitive data.