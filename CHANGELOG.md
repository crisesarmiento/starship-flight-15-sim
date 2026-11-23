# Changelog

All notable changes to starship-flight-15-sim are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- A changelog and versioning notes: Semantic Versioning, `package.json` as the
  source of truth, and a `vX.Y.Z` tag per release.

## [0.1.0] - 2026-11-23

### Added

- An unofficial, browser-based fan simulation of Flight 15, built with
  three.js, Vite, TypeScript and Vitest, including a navigable mission
  walkthrough from liftoff through catch.
- Interactive cameras (Earth, orbit, Ship, booster, tower, and free view),
  playback at 1×–1000×, a seek bar and an event log.
- Live osculating orbit from position and velocity, payload deployment into
  independent orbits, and a sourced HUD with confidence labels.
- Sourced mission data, specification, research and validation reports, plus
  a README gallery of stills and a highlights GIF.
- GitHub Pages deployment
  ([#3](https://github.com/crisesarmiento/starship-flight-15-sim/pull/3)).
- Pull request CI with lint, tests, build and a bundle size limit
  ([#5](https://github.com/crisesarmiento/starship-flight-15-sim/pull/5)).

### Changed

- Dependency updates in the npm_and_yarn group, including Vitest
  ([#1](https://github.com/crisesarmiento/starship-flight-15-sim/pull/1),
  [#2](https://github.com/crisesarmiento/starship-flight-15-sim/pull/2)).
- OpenCode project preset switched to `sim-balanced-2026-11-22`
  ([#23](https://github.com/crisesarmiento/starship-flight-15-sim/pull/23)).
- Documentation, interface, diagnostics and tests translated to English, with
  en-US number notation in the HUD and docs
  ([#25](https://github.com/crisesarmiento/starship-flight-15-sim/pull/25),
  [#26](https://github.com/crisesarmiento/starship-flight-15-sim/pull/26)).
- HUD state badges use an explicit vehicle provenance field instead of
  matching method wording
  ([#28](https://github.com/crisesarmiento/starship-flight-15-sim/pull/28)).

[Unreleased]: https://github.com/crisesarmiento/starship-flight-15-sim/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/crisesarmiento/starship-flight-15-sim/releases/tag/v0.1.0
