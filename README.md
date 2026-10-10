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

# Internationalization

Translations are stored in `src/locales/translations`. To update an existing
language, edit the matching file in that directory.

To add a new language:

1. Copy `src/locales/translations/en.ts` to a new file named after the language
   code, for example `src/locales/translations/fr.ts`.
2. Translate the string values while keeping the translation keys unchanged.
3. Register the new language in `src/locales/index.ts` by adding it to
   `loadTranslation`, `LanguageType`, and `LANGUAGE_METADATA`.
4. Check that the language appears in the launcher settings.

# Donations

While open.mp is a totally free project and everyone in the team dedicates their time on this project to provide the best for the community, we can still use whatever contribution by anyone, to cover our costs or motivate developers.  
Here is our donation link you can use to show your generosity!

- **https://opencollective.com/openmultiplayer**
