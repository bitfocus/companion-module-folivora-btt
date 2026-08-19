## BetterTouchTool (BTT)

Control [BetterTouchTool](https://folivora.ai) on a Mac from Companion, over BTT's built-in webserver.

Once connected you can fire BTT triggers from any button — and because a BTT trigger can do almost
anything on macOS, that also gets you **Alfred workflows, Keyboard Maestro macros, Shortcuts, window
management and shell scripts**, all from your Stream Deck.

---

## 1. Turn the webserver on

The webserver is **off by default**. On the Mac running BTT:

> **BTT → Settings → Advanced → Webserver → ☑ Enable BetterTouchTool Webserver**

That single screen has every value this module needs:

| BTT field | What to do |
|---|---|
| **Enable BetterTouchTool Webserver** | Tick it. |
| **Use encrypted HTTPS connection…** | **Leave it OFF.** See §3. |
| **Port** | Must be above 1024. Type a fixed number such as `12345`. |
| **Listen on** | See §2 — this is the one people get wrong. |
| **Shared secret** | See §4. |

Press **Apply Changes & Restart Webserver**. BTT confirms the result underneath, e.g.
`Webserver restarted on http://10.41.10.163:12345`. Those are exactly the values to type into
this connection's config.

> 💡 If you leave **Port** blank, BTT assigns a **random** port that can change later and silently
> break every button. Always set it explicitly.

---

## 2. "Listen on" decides what host to use — read this one

**BTT binds to only the address in "Listen on:". It does not also listen on localhost.**

| Where Companion runs | BTT's "Listen on:" | Target host in this module |
|---|---|---|
| Same Mac as BTT | `127.0.0.1` | `127.0.0.1` |
| Another machine | the Mac's local network IP | that same IP |

The moment you switch BTT to a network IP, `127.0.0.1` stops answering. If a working setup suddenly
returns "Nothing is listening", this is almost always why.

> ⚠️ **DHCP will eventually break this.** If the Mac's IP is handed out by DHCP it can change, and
> then *both* BTT's binding *and* this connection's host are wrong. Give the Mac a static IP or a
> DHCP reservation before you build a lot of buttons.

---

## 3. Leave HTTPS off

BTT's HTTPS option uses a self-signed **1024-bit** certificate. Modern TLS stacks — including the one
inside Companion — refuse keys that small, so HTTPS usually just fails.

It also fails in the most confusing way possible: sending plain HTTP to an HTTPS server (or the
reverse) does not return an error, it **hangs silently** until the request times out.

- **Recommended:** HTTPS off in BTT, both HTTPS boxes off here.
- If you must use it: tick BTT's HTTPS box, then tick **both** "Use HTTPS" *and* "Trust BTT's
  self-signed certificate" here. That encrypts the traffic but cannot verify the server's identity.

On a trusted network, plain HTTP plus a strong shared secret is the sane choice.
**Never port-forward this to the internet.**

---

## 4. The shared secret is a real security control

If BTT's secret box is empty, leave this module's secret blank and everything works.

**But if you set "Listen on" to a network IP, a strong secret stops being optional.** BTT actions can
run arbitrary scripts, so anyone who can reach that port can run code on your Mac. A short PIN like
`0000` is guessed instantly — use a long random string.

This module sends the secret as the `X-BTT-Shared-Secret` header, so it never appears in a URL that
could be logged, cached or shoulder-surfed.

A wrong or missing secret shows up as **HTTP 403** and turns the connection light to
*Authentication failure* — not a generic error.

> Note that BTT returns 403 for an unrecognised route too. This module tells the two apart: if the
> secret is verifiably working, it reports an unsupported route and leaves the connection green
> instead of wrongly blaming your credentials.

---

## 5. Named triggers vs UUIDs — prefer names

**Use "Trigger Named Trigger" wherever you can.**

Create the trigger in BTT under **Named & Other Triggers**, give it a name, attach your actions, then
type that name on the Companion button.

A UUID (right-click any configured trigger → copy UUID) points at one specific trigger *instance*.
Recreate the trigger, or switch presets, and the UUID changes — your buttons then fail **silently**,
because BTT happily accepts an unknown UUID and does nothing. A name keeps working.

The UUID action is still included for existing setups and for triggers you cannot name.

You can also pass data along with a named trigger using the **Extra variables** field
(`myVar=hello&count=2`); each key arrives inside BTT as a variable your actions can read.

---

## 6. Show the Companion web UI on your Mac (floating menu)

A neat trick from the BTT community: put Companion's own web interface into a BTT **floating menu**,
so you get a minimal always-available control window on the Mac itself.

**In BTT:**
1. Create a **Floating Menu** and name it, e.g. `CompanionUI`.
2. Add a **web view** item pointing at your Companion UI, e.g. `http://localhost:8000/tablet`.
3. Size the window however you like.

**In Companion:** use the presets in *Floating Menus / Companion on your Mac* —
**Show**, **Hide**, or **Toggle** (the toggle preset lights up while the menu is shown).

Type the menu's BTT name into the action's **Floating menu name** field.

> The toggle button tracks state inside Companion, because BTT does not report menu visibility back.
> If you also open or close the menu from BTT itself, the button's lit state can drift — press it
> twice to resync.

---

## 7. Dismissing BTT before a window action (the "hidebtt" recipe)

Also from the community, and worth knowing: while a BTT floating window is frontmost, **BTT itself is
the active app**, so any window-management action you fire lands on BTT's window instead of the one
you actually meant.

The fix is to hide BTT first and give macOS a moment to refocus:

**In BTT**, create a named trigger called `hidebtt` containing exactly two actions, in this order:
1. **Show / Hide Specific Application** → BetterTouchTool, set to *hide only*
2. **Delay Next Action** → `0.1` seconds

**In Companion**, fire `hidebtt` *before* your window action. The
**"Dismiss BTT first, then act"** preset is already wired this way — replace its second
step with the window action you want.

The delay matters: without it the window action runs before macOS has moved focus, and you are back
to acting on BTT's own window. If you need to abort a chain that is mid-delay, use
**Cancel Delayed Named Trigger**.

---

## 8. Alfred, Keyboard Maestro and other apps

There is no special support needed — you chain through BTT:

1. In BTT, make a named trigger (e.g. `alfred-action`).
2. Give it whatever action reaches the other app — *Run Apple Script*, *Execute Shell Script*,
   *Send Keyboard Shortcut*, or Alfred's / KM's own URL scheme.
3. Fire that trigger name from Companion.

Presets for `alfred-action` and `km-macro` are in the *Alfred, Keyboard Maestro & Shortcuts* category.
macOS Shortcuts have a direct action — **Run Apple Shortcut** — that does not need a BTT trigger.

---

## 9. Actions

| Action | Notes |
|---|---|
| **Trigger Named Trigger** | Preferred. Optional variable payload; optional fire-and-forget. |
| **Execute Assigned Actions For Trigger (UUID)** | Legacy-compatible; buttons from module v1.0.x keep working. |
| **Floating Menu — Show / Hide / Toggle** | Toggle state is tracked by Companion. |
| **Run BTT Action (JSON)** | Escape hatch. Right-click any BTT action → *Copy JSON* → paste. |
| **Set BTT String / Number Variable** | Optionally persistent across BTT restarts. |
| **Run Apple Shortcut** | Direct, no BTT trigger needed. |
| **Show macOS Notification** | Quickest end-to-end connection test. |
| **Cancel Delayed Named Trigger** | Aborts a trigger waiting on a delay. |

**Variables:** `$(btt:connection_state)`, `$(btt:btt_version)`, `$(btt:base_url)`,
`$(btt:last_action)`, `$(btt:last_error)`

**Feedbacks:** *BTT is reachable*, *Floating menu is shown*

---

## 10. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| **Nothing is listening on …** | Webserver not enabled, or wrong port. Check BTT's confirmation line after *Apply Changes*. |
| Worked before, now unreachable | "Listen on" changed, or DHCP moved the Mac's IP. See §2. |
| **HTTP 403** / *Authentication failure* | Shared secret missing or wrong. See §4. BTT also answers 403 for a route it does not have — if the connection light is green, it is the route, not the secret, and the log says so. |
| Requests hang, then time out | HTTP/HTTPS mismatch between BTT and this module. See §3. |
| Certificate rejected | BTT's 1024-bit cert. Tick "Trust BTT's self-signed certificate", or turn HTTPS off. |
| "BTT does not support …" | That route is missing from your BTT build — it is older than the feature. Visit `/get_info/` in a browser to list what it supports. |
| Button does nothing, no error | Almost always a stale UUID — BTT accepts unknown UUIDs silently. Switch to a named trigger (§5). |

The Companion log for this connection prints the failure and then a `↳` line telling you what to
check. `/get_info/` in a browser (with the secret) is the fastest way to confirm BTT is answering.
