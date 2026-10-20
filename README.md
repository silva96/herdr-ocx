# herdr-ocx

OCX-aware Herdr restoration for OpenCode V2. Preserves the selected root conversation, OCX profile, launcher, and explicit `OPENCODE_DB` value. Deleting the selected conversation clears its saved restore command.

Requires OpenCode V2, OCX 3, and Herdr 0.9.2 or newer. Runs only inside Herdr when launched with an OCX profile.

## Install from GitHub

Add the package to your OpenCode `cli.json` plugin list, preserving your other entries:

```json
{
  "plugins": [
    "-herdr.opencode.session-selection",
    "github:silva96/herdr-ocx"
  ]
}
```

For an OCX profile, edit `~/.config/ocx/profiles/<profile>/cli.json`. Remove any old local Herdr reporter entry, such as an absolute path to `herdr-ocx`. Disable other Herdr session/state reporters before enabling this package. Restart OpenCode after changing reporters.

Launch normally, for example:

```sh
ocx oc --profile personal
ocx oc --profile work
```

The reporter preserves `OPENCODE_DB` verbatim. OpenCode resolves relative database overrides against its data directory, not the working directory. Restoration uses `ocx oc` with the active profile.

## npm

After publishing to npm, use `herdr-ocx` in the plugin list in place of the GitHub entry above.

To validate and publish:

```sh
npm ci
npm run typecheck
npm publish --dry-run
npm publish
```

OpenCode loads the exported TypeScript entrypoints directly; no build step is needed.

MIT. See [LICENSE](./LICENSE).
