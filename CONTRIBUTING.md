# Contributing to Beberes

Thank you for your interest in contributing to **Beberes**! Beberes is a community-driven, local-first, privacy-focused system cleaner and storage optimizer designed specifically for macOS and developers.

Whether you are fixing a bug, designing a new cleaning module, translating UI strings, or improving documentation, all contributions are welcome.

---

## Code of Conduct

All contributors and participants agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please keep discussions respectful, constructive, and collaborative.

---

## Development Prerequisites

To develop and build Beberes locally, your macOS system requires:

1. **macOS**: Monterey 12.0 or later (compatible with Apple Silicon M-series and Intel x86_64).
2. **Xcode Command Line Tools**:
   ```bash
   xcode-select --install
   ```
3. **Rust Toolchain** (1.75+):
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```
4. **Node.js** (v18 or later) & **npm**:
   Recommended installation via [nvm](https://github.com/nvm-sh/nvm) or Homebrew.

---

## Local Setup Workflow

1. **Fork and Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/Beberes.git
   cd Beberes
   ```

2. **Install Frontend Dependencies**:
   ```bash
   npm install
   ```

3. **Start the Development Server**:
   ```bash
   npm run tauri dev
   ```
   This compiles the Rust backend and launches Vite with hot module replacement (HMR).

4. **Verify Production Build**:
   ```bash
   # Typecheck and build frontend
   npm run build

   # Check Rust backend compilation
   cd src-tauri && cargo check && cd ..
   ```

---

## Architecture Overview

Beberes is built with a layered architecture:

- **Frontend (`src/`)**:
  - React 18, TypeScript, and Vite.
  - Tailwind CSS with Apple frosted glassmorphism styling.
  - [Zustand](https://github.com/pmndrs/zustand) for reactive state management (`src/store/appStore.ts`).
  - Lucide React for consistent vector iconography.
  - Lightweight custom i18n hook (`src/lib/i18n.tsx`) supporting 5 languages.

- **Backend (`src-tauri/`)**:
  - Tauri v2 application core written in Rust.
  - Hardware and volume stats queried directly via native POSIX `libc::statvfs`.
  - Native file operations, multi-pass cryptographic data wiping, and macOS trash services.
  - Module handlers located under `src-tauri/src/commands/`.

---

## Contribution Guidelines & Rules

### 1. Strict Zero-Emoji Policy
To maintain a clean, professional, and accessible macOS design aesthetic:
- Do not include emoji characters in UI components, notifications, tooltips, or locale files.
- Use vector SVG icons from `lucide-react` for visual representation.
- Automated CI scans will reject any PR containing emoji characters.

### 2. Localization Standards (i18n)
Beberes officially supports 5 languages:
- English (`src/locales/en.json`)
- Indonesian (`src/locales/id.json`)
- Japanese (`src/locales/ja.json`)
- Simplified Chinese (`src/locales/zh.json`)
- Spanish (`src/locales/es.json`)

When introducing new user-facing strings, you must define the translation key across all 5 JSON files. If you are unsure of translations for a specific language, provide a high-quality literal or standard macOS terminology translation.

### 3. Safety & Whitelisting First
Beberes enforces strict system protection. Any new cleaner or deleter logic:
- Must verify that target paths exist before attempting deletion.
- Must never target paths outside allowed categories without explicit user confirmation.
- Must honor the `deleteToTrash` user preference when deleting files, utilizing macOS Trash rather than unlinking directly where applicable.

---

## Pull Request Workflow

1. Create a feature branch with a descriptive name:
   ```bash
   git checkout -b feat/my-new-cleaner
   # or
   git checkout -b fix/disk-stat-calculation
   ```

2. Implement your changes following established patterns.

3. Run the validation checks:
   ```bash
   npm run build
   cd src-tauri && cargo check && cargo clippy && cd ..
   ```

4. Commit your changes with clear, concise commit messages:
   ```bash
   git commit -m "feat(cleaner): add docker build cache cleanup support"
   ```

5. Push to your fork and submit a Pull Request against the `main` branch.

6. Provide a thorough summary of changes in the PR description using our [PR Template](.github/PULL_REQUEST_TEMPLATE.md).
