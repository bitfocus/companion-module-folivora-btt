# companion-module-folivora-btt

Bitfocus Companion module for [BetterTouchTool](https://folivora.ai) on macOS, driving BTT through its
built-in webserver.

Fire BTT named triggers and trigger UUIDs, show/hide floating menus (handy for putting the Companion
web UI in a small always-there window on your Mac), set BTT variables, and run Apple Shortcuts.
Because a BTT trigger can do nearly anything on macOS, this also reaches **Alfred**,
**Keyboard Maestro**, shell scripts and window management.

## Requirements

- BetterTouchTool with **Settings → Advanced → Webserver** enabled
- Companion 3.x (module API `@companion-module/base` 2.1)

## Setup

Full walkthrough — including the two settings that most often go wrong, the security notes for
exposing BTT on a network, and the community "hide BTT first" window-action recipe — is in
[`companion/HELP.md`](companion/HELP.md), which Companion also shows in the connection's **Help** tab.

Short version:

1. In BTT: **Settings → Advanced → Webserver** → tick **Enable**, set a fixed **Port** above 1024,
   leave **HTTPS off**, and set a **shared secret** if the server is reachable from your network.
2. Copy BTT's **"Listen on:"** value into this module's **Target host** — BTT binds to that address
   *only*, so `127.0.0.1` will not answer once you switch it to a network IP.
3. Add buttons from the **Presets** tab.

## Development

```bash
npm install
```

Point Companion's developer modules path at this folder and restart it. There is no build step —
the module is plain ESM under `src/`.

## Version 2.0.2

Rewritten for the Companion v3 module API. Module v1.0.x targeted Companion v2's `instance_skel`,
which no longer exists, so it could not load at all in current Companion.

Buttons created with v1.0.x keep working: the UUID action and the `host` / `port` config fields kept
their original identifiers.

New in 2.0.0: named-trigger support, floating-menu show/hide/toggle, raw BTT action JSON, variable
setters, Apple Shortcuts, notifications, presets, feedbacks, module variables, a polled connection
health check, and error reporting that distinguishes "not listening" from "wrong secret" from
"HTTP/HTTPS mismatch".

2.0.1 fixes two calls into the module API that prevented the connection from starting: presets are
registered with the `setPresetDefinitions(structure, presets)` two-argument form and declare
`type: 'simple'`, and variable definitions are passed as an object rather than an array.

2.0.2 fixes actions silently doing nothing when pressed. They called
`context.parseVariablesInString()`, which module API 2.x removed — option values now arrive already
resolved, so the callbacks read them directly. Shared secrets that are not printable ASCII (CJK text,
emoji) are now sent as a query parameter instead of an HTTP header, which Node refuses to send.

## License

MIT
