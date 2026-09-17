# Beberes Localization & Community Translations (i18n)

Welcome! Beberes is built to be accessible to users worldwide. You can easily add a new language or improve existing translations via a GitHub Pull Request (PR).

3. Currently Supported Languages:
   - **English (`en`)**: Source of truth & default fallback
   - **Indonesian (`id`)**: Bahasa Indonesia
   - **Japanese (`ja`)**: 日本語
   - **Chinese (`zh`)**: 简体中文
   - **Spanish (`es`)**: Español

---

## How to Add a New Language in 3 Simple Steps

### Step 1: Create your language dictionary file
Copy `src/locales/en.json` and rename it to your ISO 639-1 language code (e.g. `de.json` for German, `fr.json` for French, `jv.json` for Javanese, `su.json` for Sundanese, etc.):

```bash
cp src/locales/en.json src/locales/<lang_code>.json
```

Translate the string values inside the new JSON file. 
- Keep all JSON keys exactly identical to `en.json`.
- Keep any interpolation placeholders like `{count}`, `{size}`, `{scale}` intact so dynamic values render correctly.

---

### Step 2: Register your language in `src/locales/index.ts`
Open `src/locales/index.ts`:

1. Import your new JSON file:
   ```ts
   import de from './de.json';
   ```

2. Add your language to `supportedLanguages`:
   ```ts
   export const supportedLanguages: LanguageMeta[] = [
     // ...
     { code: 'de', name: 'German', nativeName: 'Deutsch' }, // <--- Your language here
   ];
   ```

3. Add it to the `translations` object:
   ```ts
   export const translations: Record<string, Record<string, any>> = {
     en,
     id,
     es, // <--- Your language dictionary here
   };
   ```

---

### Step 3: Test and Submit a Pull Request
1. Run `npm run build` to verify JSON syntax and TypeScript validation.
2. Verify that your new language appears in **Settings -> Appearance & Language**.
3. Open a Pull Request on GitHub with the title: `feat(i18n): add <Language Name> translation`.

---

## Automatic Fallbacks & Safety
- **No broken text**: If any key is missing in your translation, Beberes automatically falls back to the English (`en`) string without throwing errors or leaving blank gaps in the interface.
- **Zero Emojis**: Beberes adheres strictly to native Apple clean aesthetics using Lucide vector icons instead of emojis. Please avoid emojis in translation strings.
