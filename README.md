# herdr-ocx

OCX-aware Herdr restoration for OpenCode V2. Preserves the selected root conversation, OCX profile, launcher, and explicit `OPENCODE_DB` value. Deleting the selected conversation clears its saved restore command.

Requires OpenCode V2, OCX 3, and Herdr 0.9.2 or newer. Runs only inside Herdr when launched with an OCX profile. No Circle profile, registry, or VPN is required.

## Install from GitHub

Add the package to your OpenCode `cli.json` plugin list, preserving your other entries:

```json
{
  "plugins": [
    "-herdr.opencode.session-selection",
    "-circle-herdr.tui",
    "github:silva96/herdr-ocx"
  ]
}
```

For an OCX profile, edit `~/.config/ocx/profiles/<profile>/cli.json`. Remove any old local Herdr reporter entry, such as an absolute path to `herdr-ocx`. Disable other Herdr session/state reporters before enabling this package; do not run it alongside Herdr's stock integration or Circle's `circle/herdr` component. Restart OpenCode after changing reporters.

Launch normally, for example:

```sh
ocx oc --profile personal
ocx oc --profile work
```

The reporter preserves `OPENCODE_DB` verbatim. OpenCode resolves relative database overrides against its data directory, not the working directory. It also preserves the `circle-ocx` launcher when used; otherwise restoration uses `ocx oc`.

## npm

The package is prepared as `herdr-ocx@0.1.0`; npm publication is pending. After publication, replace the GitHub entry above with `herdr-ocx@0.1.0`.

To validate and publish:

```sh
npm ci
npm run typecheck
npm publish --dry-run
npm publish
```

OpenCode loads the exported TypeScript entrypoints directly; no build step is needed.

## Origin and license

Extracted with permission from the Herdr component merged in [circleco/circle-ocx#36](https://github.com/circleco/circle-ocx/pull/36), commit `562f0514edadba703e1b6e3a4f6eb4f1aba7a549`. Runtime behavior is unchanged apart from standalone plugin IDs and the `herdr:ocx` reporter source. The original repository may require Circle access.

MIT. See [LICENSE](./LICENSE).
