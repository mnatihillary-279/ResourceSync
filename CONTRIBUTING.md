Contributing to ResourceSync

1. Overview

ResourceSync is an offline-first resource tracking application developed for the Zetech Forge Alumni × Student Hackathon 2026, Software Development Challenge B.

Contributions should preserve the challenge requirements, existing application architecture and data integrity.

2. Development Requirements

Before contributing, install:

- Node.js 20 or later.
- npm 10 or later.
- MongoDB configured as a transaction-capable replica set for backend development.
- Git.

Clone the repository and install dependencies:

git clone https://github.com/mnatihillary-279/ResourceSync.git
cd ResourceSync
npm install

Configure the backend using the instructions in "INSTALLATION.md".

3. Collaboration Workflow

To reduce conflicting changes, contributors should:

1. Agree on task ownership before editing shared files.
2. Create a separate branch for each feature or fix.
3. Avoid editing the same files simultaneously without coordination.
4. Commit completed work with descriptive messages.
5. Push branches to GitHub.
6. Review changes before merging into the main development branch.

Create a feature branch:

git switch -c feature/your-feature-name

Commit changes:

git add <specific-files>
git commit -m "Describe the change"

Push the branch:

git push -u origin feature/your-feature-name

Use pull requests where available. Never force-push shared branches or overwrite another contributor's work.

4. Coding Guidelines

- Follow the existing JavaScript and React conventions.
- Keep functions focused on clearly defined responsibilities.
- Validate data received by the backend.
- Preserve offline functionality.
- Preserve FIFO ordering in the synchronization queue.
- Maintain operation-ID duplicate protection.
- Preserve deterministic conflict-resolution behaviour.
- Avoid introducing unnecessary dependencies.
- Do not include credentials or private data in source files.

5. Testing Requirements

Before submitting a change, run:

npm test
npm run build

All existing automated tests should pass.

New functionality should include relevant automated tests, especially when modifying:

- Resource creation and updates.
- IndexedDB persistence.
- Synchronization and retry behaviour.
- Duplicate operation handling.
- Conflict resolution.
- Resource Rescue recommendations.

Document any manual testing that cannot be automated.

6. Data and Privacy

Use synthetic demonstration data only.

Do not commit:

- ".env" files.
- Database credentials.
- API keys or access tokens.
- Real patient or institutional records.
- Private user information.

Follow the project's "SECURITY.md" policy.

7. Scope of Contributions

Contributions should prioritize the hackathon's Offline-First Resource Tracker requirements.

Avoid unrelated features that introduce unnecessary complexity or compromise:

- Offline-first operation.
- Reliable synchronization.
- Data consistency.
- Required data structures and algorithms.
- Testing and maintainability.

8. Documentation

Update the relevant documentation when a contribution changes application behaviour, installation steps, architecture, testing procedures or security assumptions.

Relevant documents include:

- "README.md"
- "INSTALLATION.md"
- "ARCHITECTURE.md"
- "TESTING.md"
- "docs/ACCEPTANCE.md"
- "SECURITY.md"

9. Contribution Principle

Every contribution should improve reliability, usability, maintainability or compliance with the challenge requirements without compromising existing functionality.