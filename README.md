# Starship Flight 15 Sim

An interactive, physically based 3D simulation of SpaceX Starship Flight 15 (launch, staging, booster return, orbit, deployment, maneuvers, reentry and landing), built with three.js.

> **Unofficial fan project.** Not affiliated with, endorsed by, or connected to SpaceX. All mission data comes from public sources, which are cited in `data/`. Values that are estimates are labeled as such. This is an approximation, not official telemetry.

## Status

🚧 Early stage. The spec is in [`docs/SPEC.md`](docs/SPEC.md) (coming soon).

## Planned features

- Free camera plus modes that follow the booster, the ship, or the whole Earth
- Time controls: play, pause, speed up, and jump to any mission event
- A live orbit view, with perigee and apogee that change during burns
- A telemetry panel showing altitude, velocity, downrange, g-load, inclination, period, and the current phase
- Trajectory integrated with real physics, Earth rotation, and the real launch site (Starbase, Texas)

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md). Every new data point needs a public source.

## License

[MIT](LICENSE)
