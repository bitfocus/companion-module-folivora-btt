import http from 'node:http'
import https from 'node:https'

/**
 * Why node:http instead of fetch():
 *  - we need the raw errno (ECONNREFUSED / EHOSTUNREACH / ETIMEDOUT) to tell the
 *    user *which* part of their setup is wrong, and fetch() flattens those away
 *  - BTT's optional HTTPS uses a 1024-bit self-signed cert that Node's TLS stack
 *    rejects outright, so we need per-request `rejectUnauthorized` control
 */

/**
 * HTTP header values must be printable ASCII. A secret outside that range has to
 * travel as a query parameter instead, or Node rejects the request before sending.
 */
export function isHeaderSafe(value) {
	return /^[\x20-\x7E]*$/.test(value)
}

/** Categories map 1:1 onto the InstanceStatus we report, so the UI stays honest. */
export const ErrorKind = {
	Connection: 'connection',
	Timeout: 'timeout',
	Auth: 'auth',
	Http: 'http',
	Config: 'config',
}

export class BttError extends Error {
	constructor(kind, message, hint) {
		super(message)
		this.name = 'BttError'
		this.kind = kind
		/** Plain-language "here is what to check" line shown in the Companion log. */
		this.hint = hint
	}
}

export class BttClient {
	#config

	constructor(config) {
		this.#config = config
	}

	updateConfig(config) {
		this.#config = config
	}

	get baseUrl() {
		const { host, port, useHttps } = this.#config
		return `${useHttps ? 'https' : 'http'}://${host}:${port}`
	}

	#assertConfigured() {
		const { host, port } = this.#config
		if (!host) {
			throw new BttError(
				ErrorKind.Config,
				'No BTT host configured',
				'Enter the value BTT shows next to "Listen on:" in Advanced → Webserver.',
			)
		}
		if (!port) {
			throw new BttError(ErrorKind.Config, 'No BTT port configured', 'Enter the port from Advanced → Webserver.')
		}
	}

	/**
	 * Call a BTT webserver route.
	 * `params` become query parameters; the shared secret always travels as a
	 * header so it never ends up in a URL that could be logged or cached.
	 */
	async call(route, params = {}) {
		this.#assertConfigured()

		const url = new URL(`/${route}/`, this.baseUrl)
		for (const [key, value] of Object.entries(params)) {
			if (value !== undefined && value !== null && value !== '') {
				url.searchParams.set(key, String(value))
			}
		}

		const headers = { Accept: 'application/json, text/plain, */*' }
		const secret = this.#config.sharedSecret?.trim()
		if (secret) {
			// Prefer the header: it keeps the secret out of URLs that get logged or cached.
			// But HTTP header values are ASCII-only — a secret containing e.g. CJK characters
			// or emoji makes Node throw ERR_INVALID_CHAR before the request even leaves. BTT
			// accepts the query parameter too, so fall back to that rather than fail outright.
			if (isHeaderSafe(secret)) {
				headers['X-BTT-Shared-Secret'] = secret
			} else {
				url.searchParams.set('shared_secret', secret)
			}
		}

		const transport = this.#config.useHttps ? https : http
		const options = {
			method: 'GET',
			headers,
			timeout: Math.max(1, Number(this.#config.timeout) || 5) * 1000,
		}
		if (this.#config.useHttps && this.#config.allowSelfSigned) {
			options.rejectUnauthorized = false
		}

		return await new Promise((resolve, reject) => {
			const req = transport.request(url, options, (res) => {
				const chunks = []
				res.on('data', (c) => chunks.push(c))
				res.on('end', () => {
					const body = Buffer.concat(chunks).toString('utf8')
					const status = res.statusCode ?? 0

					if (status === 403 || status === 401) {
						// BTT answers 403 for an unknown route as well as for a bad secret, so
						// this status alone cannot tell them apart. We flag it and let the
						// instance disambiguate using whether /get_info/ currently works.
						const err = new BttError(
							ErrorKind.Auth,
							`BTT refused the request to "${route}" (HTTP ${status})`,
							secret
								? `Either the shared secret does not match BTT → Advanced → Webserver, or this BTT build has no "${route}" route.`
								: 'BTT has a shared secret set, but this connection has none. Copy it into the module config.',
						)
						err.route = route
						err.ambiguous = Boolean(secret)
						reject(err)
						return
					}
					if (status === 404) {
						reject(
							new BttError(
								ErrorKind.Http,
								`BTT does not know the route "${route}" (HTTP 404)`,
								'This usually means your BTT version is older than the feature. Check /get_info/ for the routes it supports.',
							),
						)
						return
					}
					if (status < 200 || status >= 300) {
						reject(new BttError(ErrorKind.Http, `BTT returned HTTP ${status}`, body.slice(0, 200) || undefined))
						return
					}
					resolve(body)
				})
			})

			req.on('timeout', () => {
				req.destroy(
					new BttError(
						ErrorKind.Timeout,
						`BTT did not answer within ${options.timeout / 1000}s`,
						this.#config.useHttps
							? 'A silent timeout on HTTPS usually means BTT is actually serving plain HTTP — try turning "Use HTTPS" off here.'
							: 'If BTT has HTTPS enabled, plain HTTP requests hang exactly like this. Match the two settings.',
					),
				)
			})

			req.on('error', (err) => {
				if (err instanceof BttError) {
					reject(err)
					return
				}
				reject(this.#describeSocketError(err))
			})

			req.end()
		})
	}

	/** Same as call(), but parses JSON and tolerates BTT's plain-text replies. */
	async callJson(route, params = {}) {
		const body = await this.call(route, params)
		try {
			return JSON.parse(body)
		} catch {
			return body
		}
	}

	/** Cheap, read-only liveness probe. Also tells us BTT's version. */
	async getInfo() {
		const info = await this.callJson('get_info')
		return typeof info === 'object' && info !== null ? info : {}
	}

	#describeSocketError(err) {
		const { host, port } = this.#config
		switch (err.code) {
			case 'ECONNREFUSED':
				return new BttError(
					ErrorKind.Connection,
					`Nothing is listening on ${host}:${port}`,
					'Enable "BetterTouchTool Webserver" in BTT → Advanced → Webserver, and check the port matches.',
				)
			case 'EHOSTUNREACH':
			case 'ENETUNREACH':
				return new BttError(
					ErrorKind.Connection,
					`Cannot reach ${host} on the network`,
					'Is the Mac awake and on the same network? Note BTT binds ONLY to the address in "Listen on:".',
				)
			case 'ETIMEDOUT':
				return new BttError(ErrorKind.Timeout, `Connection to ${host}:${port} timed out`, 'Check for a firewall between Companion and the Mac.')
			case 'ECONNRESET':
				return new BttError(
					ErrorKind.Connection,
					`BTT closed the connection on ${host}:${port}`,
					'Most often an HTTP/HTTPS mismatch between this module and BTT.',
				)
			case 'ENOTFOUND':
			case 'EAI_AGAIN':
				return new BttError(ErrorKind.Config, `Cannot resolve host "${host}"`, 'Use the Mac\'s IP address rather than a hostname.')
			case 'EPROTO':
			case 'ERR_SSL_WRONG_VERSION_NUMBER':
				return new BttError(
					ErrorKind.Connection,
					'TLS handshake failed',
					'BTT is probably serving plain HTTP. Turn "Use HTTPS" off in this connection.',
				)
			default:
				if (err.code?.startsWith('ERR_TLS') || err.code === 'CERT_HAS_EXPIRED' || err.code === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
					return new BttError(
						ErrorKind.Connection,
						`BTT's certificate was rejected (${err.code})`,
						'BTT\'s self-signed cert is only 1024-bit, which Node refuses. Enable "Trust BTT\'s self-signed certificate" here, or simply turn HTTPS off in BTT.',
					)
				}
				return new BttError(ErrorKind.Connection, err.message || 'Request failed', err.code)
		}
	}
}
