import { InstanceBase, InstanceStatus } from '@companion-module/base'
import { BttClient, BttError, ErrorKind } from './api.js'
import { getConfigFields, normalizeConfig } from './config.js'
import { buildActions } from './actions.js'
import { buildFeedbacks, FEEDBACK_IDS } from './feedbacks.js'
import { buildPresets } from './presets.js'
import { buildVariableDefinitions, computeVariableValues } from './variables.js'

/** BttError.kind → the status light Companion shows, so the colour always matches the cause. */
const STATUS_BY_KIND = {
	[ErrorKind.Auth]: InstanceStatus.AuthenticationFailure,
	[ErrorKind.Config]: InstanceStatus.BadConfig,
	[ErrorKind.Connection]: InstanceStatus.ConnectionFailure,
	[ErrorKind.Timeout]: InstanceStatus.ConnectionFailure,
	[ErrorKind.Http]: InstanceStatus.UnknownWarning,
}

class BttInstance extends InstanceBase {
	client = new BttClient(normalizeConfig())
	/** Companion cannot read BTT's real menu state, so we track what we set. */
	floatingMenuShown = new Map()
	connectionOk = false
	connectionState = 'Starting up'
	bttVersion = ''
	lastAction = ''
	lastError = ''
	#pollTimer = null

	async init(config) {
		this.config = normalizeConfig(config)
		this.client.updateConfig(this.config)

		this.setActionDefinitions(buildActions(this))
		this.setFeedbackDefinitions(buildFeedbacks(this))
		const { structure, presets } = buildPresets()
		this.setPresetDefinitions(structure, presets)
		this.setVariableDefinitions(buildVariableDefinitions())

		this.updateStatus(InstanceStatus.Connecting)
		this.#syncVariables()
		this.#startPolling()
		this.#kickConnectionCheck()
	}

	async destroy() {
		this.#stopPolling()
	}

	async configUpdated(config) {
		this.config = normalizeConfig(config)
		this.client.updateConfig(this.config)
		this.floatingMenuShown.clear()

		this.updateStatus(InstanceStatus.Connecting)
		this.#syncVariables()
		this.#startPolling()
		this.#kickConnectionCheck()
	}

	getConfigFields() {
		return getConfigFields()
	}

	/**
	 * Single funnel for every action. Returns true on success so callers can
	 * update local state only when BTT actually accepted the command.
	 */
	async request(route, params, description) {
		try {
			await this.client.call(route, params)
			this.lastAction = description ?? route
			this.lastError = ''
			this.#markHealthy()
			return true
		} catch (err) {
			this.#reportError(err, description ?? route)
			return false
		}
	}

	#markHealthy() {
		const wasDown = !this.connectionOk
		this.connectionOk = true
		this.connectionState = 'Ok'
		if (wasDown) {
			this.updateStatus(InstanceStatus.Ok)
			this.checkFeedbacks(FEEDBACK_IDS.connectionOk)
		}
		this.#syncVariables()
	}

	#reportError(err, description) {
		const isBtt = err instanceof BttError
		let kind = isBtt ? err.kind : ErrorKind.Connection
		let message = isBtt ? err.message : (err?.message ?? String(err))
		let hint = isBtt ? err.hint : undefined

		// BTT returns 403 both for a bad shared secret and for a route it does not
		// have. If our secret is currently working for /get_info/, then a 403 is
		// about the route — so say that instead of blaming the credentials, and
		// leave the connection green because it is genuinely still up.
		if (isBtt && kind === ErrorKind.Auth && err.ambiguous && this.connectionOk) {
			this.log('error', `BTT does not support "${err.route}" (HTTP 403) — could not send ${description}.`)
			this.log(
				'info',
				`↳ The shared secret is working, so this is a route your BTT build lacks. Open ${this.client.baseUrl}/get_info/ to list supported routes.`,
			)
			this.lastError = `Unsupported route: ${err.route}`
			this.#syncVariables()
			return
		}

		// Two lines on purpose: what failed, then what to do about it.
		this.log('error', `Could not send ${description}: ${message}`)
		if (hint) {
			this.log('info', `↳ ${hint}`)
		}

		this.connectionOk = false
		this.connectionState = message
		this.lastError = message
		this.updateStatus(STATUS_BY_KIND[kind] ?? InstanceStatus.UnknownError, message)
		this.checkFeedbacks(FEEDBACK_IDS.connectionOk)
		this.#syncVariables()
	}

	/**
	 * Companion waits for init()/configUpdated() to resolve before it treats the
	 * save as complete, so neither may block on network I/O. An unreachable host
	 * does not fail fast — the request sits until the configured timeout — which
	 * would stall the save for seconds at exactly the moment the user is trying
	 * to correct a wrong address. Start the check and return immediately.
	 */
	#kickConnectionCheck() {
		this.#checkConnection().catch(() => {
			/* #checkConnection reports its own failures; never surface a rejection here */
		})
	}

	async #checkConnection() {
		try {
			const info = await this.client.getInfo()
			this.bttVersion = String(info.version ?? '')
			this.lastError = ''
			this.connectionOk = true
			this.connectionState = 'Ok'
			this.updateStatus(InstanceStatus.Ok)
			this.checkFeedbacks(FEEDBACK_IDS.connectionOk)
			this.#syncVariables()
		} catch (err) {
			this.bttVersion = ''
			this.#reportError(err, 'connection check')
		}
	}

	#startPolling() {
		this.#stopPolling()
		const seconds = Number(this.config.pollInterval) || 0
		if (seconds <= 0) return
		this.#pollTimer = setInterval(() => {
			this.#checkConnection().catch(() => {
				/* #checkConnection already reports; never let a rejection escape the timer */
			})
		}, seconds * 1000)
	}

	#stopPolling() {
		if (this.#pollTimer) {
			clearInterval(this.#pollTimer)
			this.#pollTimer = null
		}
	}

	#syncVariables() {
		this.setVariableValues(computeVariableValues(this))
	}
}

// base 2.x registers the module via the entrypoint file's default export.
export default BttInstance
