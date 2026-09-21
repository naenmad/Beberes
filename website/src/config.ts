import rootPkg from '../../package.json';

export const APP_CONFIG = {
  name: 'Beberes',
  tagline: 'High-performance macOS disk cleaner and developer workspace optimizer.',
  description: 'Built with Rust and Tauri v2. Reclaim tens of gigabytes from build artifacts, Xcode simulator runtimes, orphaned cache files, and zombie local processes with safety boundaries.',
  version: `v${rootPkg.version}`,
  rawVersion: rootPkg.version,
  githubRepo: 'naenmad/Beberes',
  githubUrl: 'https://github.com/naenmad/Beberes',
  downloadDmgUrl: 'https://github.com/naenmad/Beberes/releases/latest/download/Beberes.dmg',
  releasesUrl: 'https://github.com/naenmad/Beberes/releases',
  license: 'GPL-3.0',
  licenseUrl: 'https://github.com/naenmad/Beberes/blob/main/LICENSE',
  minMacOS: 'macOS 11.0+ (Universal Apple Silicon & Intel)',
  recommendedRam: '8 GB, 16 GB, or more',
};
