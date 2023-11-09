# open.mp launcher

Made with Tauri + React-Native ❤️

# Usage:

Just download from [Releases](https://github.com/openmultiplayer/launcher/releases) page and run it!  

For users using old Windows 10, Windows 8(.1), or Windows 7, if you do not have WebView2 installed (comes preinstalled in newer Windows 10 and 11 setups, and comes with Microsoft Edge), you must download **WebView2** from [Here](https://developer.microsoft.com/en-us/microsoft-edge/webview2/#download-section)  
https://developer.microsoft.com/en-us/microsoft-edge/webview2/#download-section

**Note**: Download Evergreen Bootstrapper and let installer download the right version for you for best experience.

# Development

### For all OS's:

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

# Donations

While open.mp is a totally free project and everyone in the team dedicates their time on this project to provide the best for the community, we can still use whatever contribution by anyone, to cover our costs or motivate developers.  
Here is our donation link you can use to show your generosity!  
- **https://opencollective.com/openmultiplayer**
