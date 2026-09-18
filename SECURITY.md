# Security Policy

The Beberes team takes the security, reliability, and privacy of our software and user data seriously. As a system maintenance utility that interacts directly with the macOS filesystem, we are committed to transparent, responsible security practices.

---

## Supported Versions

We provide security updates and patches for the following versions of Beberes:

| Version | Supported | Status |
| :--- | :---: | :--- |
| **1.0.x** | Yes | Currently supported with active bug fixes and security patches. |
| **< 1.0** | No | Pre-release and development snapshots. Please upgrade to the latest stable release. |

---

## Privacy & Safety Architecture

Beberes is engineered with strict local-first and security guardrails:

1. **100% Local-First & Offline**:
   - Zero telemetry, network tracking, analytics, or background data collection.
   - All scanning, analysis, and cleaning procedures run entirely on your local machine using native POSIX filesystem operations.
2. **System Directory Whitelisting**:
   - Critical macOS system locations (including `/System`, `/usr`, `/bin`, `/sbin`, `/Library/Preferences/SystemConfiguration`, and essential system libraries) are strictly whitelisted and prohibited from automated modification or deletion.
3. **Non-Root Execution**:
   - Beberes operates within standard user privileges and does not require persistent root daemons or background background helpers running in privileged mode.
4. **macOS Native Trash Integration**:
   - By default, files cleaned by Beberes are moved to the native macOS Trash (`~/.Trash`), allowing users to restore items if needed. Direct permanent deletion requires explicit user confirmation.

---

## Reporting a Vulnerability

If you discover a security vulnerability or sensitive bug within Beberes, please **do not open a public GitHub issue**. Instead, follow responsible disclosure practices:

1. **GitHub Private Vulnerability Reporting (Recommended)**:
   - Navigate to the [Security Advisories](https://github.com/naenmad/Beberes/security/advisories) tab of this repository.
   - Click **"Report a vulnerability"** to submit a private draft report directly to the maintainers.
2. **Include Detail in Your Report**:
   - A clear description of the vulnerability and its potential impact.
   - Exact steps to reproduce the issue (proof-of-concept script, reproduction commands, or relevant log excerpts).
   - The affected macOS architecture (Apple Silicon / Intel) and operating system version.
3. **Response Timeline**:
   - We will acknowledge receipt of your vulnerability report within **48 hours**.
   - We will keep you updated on progress towards resolution and coordinate release timing.
   - Security advisories and patches will be released promptly in subsequent minor/patch updates.

Thank you for helping keep Beberes and our users safe.
