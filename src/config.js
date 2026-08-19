import { Regex } from '@companion-module/base'

export const DEFAULT_CONFIG = {
	host: '127.0.0.1',
	port: 12345,
	sharedSecret: '',
	useHttps: false,
	allowSelfSigned: false,
	timeout: 5,
	pollInterval: 10,
}

/** Fill in anything the user has not set yet, and coerce types from the UI. */
export function normalizeConfig(config = {}) {
	return {
		...DEFAULT_CONFIG,
		...config,
		host: String(config.host ?? DEFAULT_CONFIG.host).trim(),
		port: Number(config.port) || DEFAULT_CONFIG.port,
		sharedSecret: String(config.sharedSecret ?? '').trim(),
		useHttps: Boolean(config.useHttps),
		allowSelfSigned: Boolean(config.allowSelfSigned),
		timeout: Number(config.timeout) || DEFAULT_CONFIG.timeout,
		pollInterval: Number(config.pollInterval) || DEFAULT_CONFIG.pollInterval,
	}
}

export function getConfigFields() {
	return [
		{
			type: 'static-text',
			id: 'setup-intro',
			width: 12,
			label: 'Step 1 — switch on the BTT webserver',
			value:
				'On the Mac running BetterTouchTool, open <b>BTT → Settings → Advanced → Webserver</b> and tick ' +
				'<b>“Enable BetterTouchTool Webserver”</b>. It is off by default, and nothing here will work until it is on.' +
				'<br><br>That one screen has every value you need below. Press <b>“Apply Changes &amp; Restart Webserver”</b> after editing it — ' +
				'BTT then confirms the address it is serving on, e.g. <i>Webserver restarted on http://10.41.10.163:12345</i>.',
		},
		{
			type: 'static-text',
			id: 'setup-host-help',
			width: 12,
			label: 'Step 2 — copy “Listen on:” into Target host',
			value:
				'<b>This is the single most common mistake, so read this one.</b> BTT binds to <i>only</i> the address in its ' +
				'<b>“Listen on:”</b> box — it does not also listen on localhost.' +
				'<br><br>• Companion on the <b>same Mac</b> as BTT → leave BTT on <code>127.0.0.1</code> and enter <code>127.0.0.1</code> here.' +
				'<br>• Companion on <b>another machine</b> → set BTT\'s “Listen on:” to the Mac\'s local network IP and enter that same IP here. ' +
				'The moment you do that, <code>127.0.0.1</code> stops working.' +
				'<br><br>⚠️ If that IP comes from DHCP it can change and silently break every button. Give the Mac a static IP or a DHCP reservation.',
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'Target host (BTT\'s “Listen on:” value)',
			tooltip: 'Must match BTT\'s "Listen on:" field exactly. Use an IP address, not a hostname.',
			width: 6,
			default: DEFAULT_CONFIG.host,
			regex: Regex.HOSTNAME,
		},
		{
			type: 'number',
			id: 'port',
			label: 'Port (BTT\'s “Port:” value)',
			tooltip: 'BTT requires a port above 1024. If you left it blank in BTT, it picked a random one — set a fixed value so it survives restarts.',
			width: 6,
			default: DEFAULT_CONFIG.port,
			min: 1025,
			max: 65535,
		},
		{
			type: 'static-text',
			id: 'setup-secret-help',
			width: 12,
			label: 'Step 3 — shared secret',
			value:
				'Leave blank if BTT\'s secret box is empty. If BTT has one, paste it here or every request comes back <b>HTTP 403</b>.' +
				'<br><br>🔒 <b>If you exposed the webserver to your network, a secret is not optional.</b> BTT actions can run arbitrary scripts, ' +
				'so anyone who can reach the port can run code on that Mac. Use a long random string — not <code>0000</code> or a PIN. ' +
				'This module sends it as the <code>X-BTT-Shared-Secret</code> header, so it never appears in a URL.',
		},
		{
			type: 'textinput',
			id: 'sharedSecret',
			label: 'Shared secret (blank if BTT has none)',
			width: 12,
			default: '',
		},
		{
			type: 'static-text',
			id: 'setup-https-help',
			width: 12,
			label: 'Step 4 — HTTPS (leave both off unless you need them)',
			value:
				'<b>Recommended: leave BTT\'s HTTPS checkbox off and both boxes below off.</b>' +
				'<br><br>BTT\'s HTTPS uses a self-signed <b>1024-bit</b> certificate, which modern TLS stacks — Node included — refuse. ' +
				'It also fails confusingly: an <code>http://</code> request to an HTTPS server just <i>hangs</i> until it times out, with no error. ' +
				'If you do enable HTTPS in BTT, tick both boxes below.' +
				'<br><br>On a trusted LAN plain HTTP plus a strong shared secret is the practical setup. Never port-forward this to the internet.',
		},
		{
			type: 'checkbox',
			id: 'useHttps',
			label: 'Use HTTPS (only if BTT\'s HTTPS box is ticked)',
			width: 6,
			default: false,
		},
		{
			type: 'checkbox',
			id: 'allowSelfSigned',
			label: 'Trust BTT\'s self-signed certificate',
			tooltip: 'Required for BTT\'s 1024-bit cert. Encrypts the traffic but cannot verify the server identity.',
			width: 6,
			default: false,
		},
		{
			type: 'number',
			id: 'timeout',
			label: 'Request timeout (seconds)',
			width: 6,
			default: DEFAULT_CONFIG.timeout,
			min: 1,
			max: 60,
		},
		{
			type: 'number',
			id: 'pollInterval',
			label: 'Connection check interval (seconds, 0 = off)',
			tooltip: 'Polls BTT\'s read-only /get_info/ route so the connection light and $(btt:version) stay accurate.',
			width: 6,
			default: DEFAULT_CONFIG.pollInterval,
			min: 0,
			max: 300,
		},
		{
			type: 'static-text',
			id: 'setup-next',
			width: 12,
			label: 'Step 5 — what to put on your buttons',
			value:
				'Open the <b>Presets</b> tab for this connection: there are ready-made buttons for named triggers, floating menus and the ' +
				'“hide BTT first” recipe. Full walkthroughs — including calling <b>Alfred</b> or <b>Keyboard Maestro</b> through BTT, and showing the ' +
				'Companion web UI in a floating BTT window — are in this module\'s <b>Help</b> tab.' +
				'<br><br>💡 Prefer <b>Trigger Named Trigger</b> over the UUID action: a UUID changes if you recreate the trigger or switch presets, ' +
				'and your buttons then fail silently. A name keeps working.',
		},
	]
}
