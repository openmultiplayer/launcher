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

# Code Signing

Release builds are automatically signed using [SignPath Foundation](https://about.signpath.io/product/open-source) — a **free** code signing service for open-source projects.

### How to set up free code signing for your fork

1. **Apply for a free open-source certificate**  
   Go to [https://about.signpath.io/product/open-source](https://about.signpath.io/product/open-source) and submit an application. SignPath Foundation provides free code signing certificates to qualifying open-source projects hosted on GitHub.

2. **Create a project in SignPath**  
   Once approved, log into your [SignPath](https://app.signpath.io) account and create a new project (e.g. `omp-launcher`). Inside the project, create a **signing policy** (e.g. `release-signing`) and link your code signing certificate.

3. **Connect SignPath to your GitHub repository**  
   In the SignPath project settings, authorize access to your GitHub repository so the `signpath/github-action-submit-signing-request` action can submit signing requests.

4. **Add secrets and variables to your GitHub repository**  
   Go to your repository **Settings → Secrets and variables → Actions** and add the following:

   | Type     | Name                          | Value                                                   |
   |----------|-------------------------------|---------------------------------------------------------|
   | Secret   | `SIGNPATH_API_TOKEN`          | API token from your SignPath account                    |
   | Variable | `SIGNPATH_ORGANIZATION_ID`    | Organization ID shown in your SignPath account settings |
   | Variable | `SIGNPATH_PROJECT_SLUG`       | The project slug you created (e.g. `omp-launcher`)     |
   | Variable | `SIGNPATH_SIGNING_POLICY_SLUG`| The signing policy slug (e.g. `release-signing`)       |

5. **Done!**  
   The CI workflow (`.github/workflows/build.yml`) is already configured to sign both the portable `.exe` and the NSIS setup installer on every push to `master`. Signing is skipped for pull requests.

# Donations

While open.mp is a totally free project and everyone in the team dedicates their time on this project to provide the best for the community, we can still use whatever contribution by anyone, to cover our costs or motivate developers.  
Here is our donation link you can use to show your generosity!

- **https://opencollective.com/openmultiplayer**
