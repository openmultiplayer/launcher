# open.mp launcher

Made with Tauri + React-Native ❤️

# Usage:

Use open.mp launcher to enjoy a live, reliable, and populated server list to find any server you want to play on!  
Just download it from [Releases](https://github.com/openmultiplayer/launcher/releases/latest) page and run it!

# Development

### For all OSes:

- Install [nightly version](https://rust-lang.github.io/rustup/concepts/channels.html) of rust toolchain
- Install [NodeJS](https://nodejs.org/en/download) and `npm` (or `yarn` or anything else)  
  **Note**: Please make sure you are not using node v20.6, anything else, lower or higher, should work fine.
- Clone repository:

```bash
git clone https://github.com/openmultiplayer/launcher
```

- Prepare for running:

```bash
cd launcher
yarn # or any other way you use to install dependecies using your installed package manager
yarn start
```

- For building a release version, you can use:

```bash
yarn tauri build
```

# Translations

Translations live in `src/locales/translations/`, one TypeScript file per language (e.g. `es.ts`, `ru.ts`). The English file `en.ts` is the source of truth and every language file must keep the same keys.

To add or update a language:

1. Copy `src/locales/translations/en.ts` to a new file (e.g. `xx.ts`) and translate the values, keeping the keys unchanged.
2. Register the new language in `src/locales/index.ts`: add it to `loadTranslation`, `LanguageType` and `LANGUAGE_METADATA`.
3. Open a pull request.

Missing keys fall back to English, so keeping keys in sync with `en.ts` is the only requirement.

# Donations

While open.mp is a totally free project and everyone in the team dedicates their time on this project to provide the best for the community, we can still use whatever contribution by anyone, to cover our costs or motivate developers.  
Here is our donation link you can use to show your generosity!

- **https://opencollective.com/openmultiplayer**
