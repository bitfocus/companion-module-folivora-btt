/**
 * BTT "predefined action" type numbers used by the convenience actions below.
 * Verified against BTT 6.737 by reading back a live configuration via /get_triggers/.
 * If a future BTT renumbers these, the raw "Run BTT Action (JSON)" action is the escape hatch.
 */
export const BttActionType = {
	ShowFloatingMenu: 386,
	HideFloatingMenu: 387,
}

export const ACTION_IDS = {
	// Kept as 'uuid' on purpose: this was the only action in module v1.0.x, so
	// existing buttons keep working after upgrading instead of turning blank.
	executeUuid: 'uuid',
	triggerNamed: 'trigger_named',
	showFloatingMenu: 'show_floating_menu',
	hideFloatingMenu: 'hide_floating_menu',
	toggleFloatingMenu: 'toggle_floating_menu',
	triggerActionJson: 'trigger_action_json',
	setStringVariable: 'set_string_variable',
	setNumberVariable: 'set_number_variable',
	runShortcut: 'run_shortcut',
	displayNotification: 'display_notification',
	cancelDelayedNamedTrigger: 'cancel_delayed_named_trigger',
}

/** Turn "foo=1&bar=hello" into query params BTT exposes as BTT variables. */
function parseExtraParams(raw) {
	const out = {}
	if (!raw) return out
	for (const pair of new URLSearchParams(raw.replace(/^[?&]+/, ''))) {
		out[pair[0]] = pair[1]
	}
	return out
}

/**
 * base 2.x resolves variables and expressions in option values before invoking the
 * callback, and removed context.parseVariablesInString entirely — so option values
 * arrive ready to use. This just normalises them to a trimmed string.
 */
function str(value) {
	return value === undefined || value === null ? '' : String(value).trim()
}

export function buildActions(self) {
	return {
		[ACTION_IDS.triggerNamed]: {
			name: 'Trigger Named Trigger (recommended)',
			description:
				'Fires a trigger from BTT\'s "Named & Other Triggers" tab. Preferred over UUIDs — the name survives preset switches and rebuilt triggers.',
			options: [
				{
					type: 'textinput',
					id: 'triggerName',
					label: 'Trigger name (as typed in BTT)',
					default: '',
					useVariables: true,
				},
				{
					type: 'textinput',
					id: 'extraParams',
					label: 'Extra variables (optional, e.g. myVar=hello&other=2)',
					tooltip: 'Each key becomes a BTT variable your trigger can read.',
					default: '',
					useVariables: true,
				},
				{
					type: 'checkbox',
					id: 'async',
					label: 'Fire and forget (do not wait for BTT to finish)',
					default: false,
				},
			],
			callback: async (event) => {
				const triggerName = str(event.options.triggerName)
				if (!triggerName) {
					self.log('warn', 'Trigger Named Trigger: no trigger name given, nothing sent.')
					return
				}
				const route = event.options.async ? 'trigger_named_async_without_response' : 'trigger_named'
				await self.request(route, {
					trigger_name: triggerName,
					...parseExtraParams(str(event.options.extraParams)),
				}, `named trigger "${triggerName}"`)
			},
		},

		[ACTION_IDS.executeUuid]: {
			name: 'Execute Assigned Actions For Trigger (UUID)',
			description:
				'Runs whatever actions are attached to one specific trigger. Get the UUID by right-clicking the trigger in BTT. Note a UUID changes if the trigger is recreated.',
			options: [
				{
					type: 'textinput',
					id: 'uuid',
					label: 'Trigger UUID',
					default: '',
					useVariables: true,
				},
			],
			callback: async (event) => {
				const uuid = str(event.options.uuid)
				if (!uuid) {
					self.log('warn', 'Execute Assigned Actions: no UUID given, nothing sent.')
					return
				}
				await self.request('execute_assigned_actions_for_trigger', { uuid }, `trigger ${uuid}`)
			},
		},

		[ACTION_IDS.showFloatingMenu]: {
			name: 'Floating Menu — Show',
			description:
				'Shows a BTT floating menu by name. Use this to pop up a floating web view containing the Companion web UI (see Help for the setup).',
			options: [floatingMenuOption()],
			callback: async (event) => {
				await runFloatingMenu(self, event, BttActionType.ShowFloatingMenu, 'show')
			},
		},

		[ACTION_IDS.hideFloatingMenu]: {
			name: 'Floating Menu — Hide',
			description: 'Hides a BTT floating menu by name.',
			options: [floatingMenuOption()],
			callback: async (event) => {
				await runFloatingMenu(self, event, BttActionType.HideFloatingMenu, 'hide')
			},
		},

		[ACTION_IDS.toggleFloatingMenu]: {
			name: 'Floating Menu — Toggle (this button remembers the state)',
			description:
				'Alternates show/hide on each press. The state is tracked by Companion, so it can drift if you also open the menu from BTT itself.',
			options: [floatingMenuOption()],
			callback: async (event) => {
				const menuName = str(event.options.menuName)
				if (!menuName) {
					self.log('warn', 'Floating Menu Toggle: no menu name given, nothing sent.')
					return
				}
				const shouldShow = !self.floatingMenuShown.get(menuName)
				await runFloatingMenu(
					self,
					event,
					shouldShow ? BttActionType.ShowFloatingMenu : BttActionType.HideFloatingMenu,
					shouldShow ? 'show' : 'hide',
				)
			},
		},

		[ACTION_IDS.triggerActionJson]: {
			name: 'Run BTT Action (JSON)',
			description:
				'Runs any BTT action. In BTT, right-click a configured action → "Copy JSON", then paste it here. This is the escape hatch for anything the actions above do not cover.',
			options: [
				{
					type: 'textinput',
					id: 'json',
					label: 'BTT action JSON',
					tooltip: 'Example: {"BTTPredefinedActionType":254,"BTTAdditionalActionData":{"BTTActionHUDTitle":"Hello"}}',
					default: '',
					useVariables: true,
				},
			],
			callback: async (event) => {
				const raw = str(event.options.json)
				if (!raw) {
					self.log('warn', 'Run BTT Action: no JSON given, nothing sent.')
					return
				}
				try {
					JSON.parse(raw)
				} catch (err) {
					self.log('error', `Run BTT Action: that is not valid JSON — ${err.message}`)
					return
				}
				await self.request('trigger_action', { json: raw }, 'BTT action JSON')
			},
		},

		[ACTION_IDS.setStringVariable]: {
			name: 'Set BTT String Variable',
			options: [
				{ type: 'textinput', id: 'name', label: 'Variable name', default: '', useVariables: true },
				{ type: 'textinput', id: 'value', label: 'Value', default: '', useVariables: true },
				{ type: 'checkbox', id: 'persistent', label: 'Persist across BTT restarts', default: false },
			],
			callback: async (event) => {
				const name = str(event.options.name)
				if (!name) return
				const route = event.options.persistent ? 'set_persistent_string_variable' : 'set_string_variable'
				await self.request(route, { variableName: name, to: str(event.options.value) }, `string variable ${name}`)
			},
		},

		[ACTION_IDS.setNumberVariable]: {
			name: 'Set BTT Number Variable',
			options: [
				{ type: 'textinput', id: 'name', label: 'Variable name', default: '', useVariables: true },
				{ type: 'textinput', id: 'value', label: 'Value', default: '0', useVariables: true },
				{ type: 'checkbox', id: 'persistent', label: 'Persist across BTT restarts', default: false },
			],
			callback: async (event) => {
				const name = str(event.options.name)
				if (!name) return
				const value = Number(str(event.options.value))
				if (Number.isNaN(value)) {
					self.log('error', `Set BTT Number Variable: "${event.options.value}" is not a number.`)
					return
				}
				const route = event.options.persistent ? 'set_persistent_number_variable' : 'set_number_variable'
				await self.request(route, { variableName: name, to: value }, `number variable ${name}`)
			},
		},

		[ACTION_IDS.runShortcut]: {
			name: 'Run Apple Shortcut',
			description: 'Runs a macOS Shortcuts shortcut by name, via BTT.',
			options: [
				{ type: 'textinput', id: 'name', label: 'Shortcut name', default: '', useVariables: true },
				{ type: 'textinput', id: 'input', label: 'Input (optional)', default: '', useVariables: true },
				{ type: 'checkbox', id: 'async', label: 'Fire and forget', default: true },
			],
			callback: async (event) => {
				const name = str(event.options.name)
				if (!name) return
				const route = event.options.async ? 'run_shortcut_async_without_response' : 'run_shortcut'
				await self.request(route, { shortcut_name: name, input: str(event.options.input) }, `shortcut "${name}"`)
			},
		},

		[ACTION_IDS.displayNotification]: {
			name: 'Show macOS Notification',
			description: 'Handy for confirming the connection works end to end.',
			options: [
				{ type: 'textinput', id: 'title', label: 'Title', default: 'Companion', useVariables: true },
				{ type: 'textinput', id: 'text', label: 'Text', default: '', useVariables: true },
			],
			callback: async (event) => {
				await self.request(
					'display_notification',
					{ title: str(event.options.title), text: str(event.options.text) },
					'notification',
				)
			},
		},

		[ACTION_IDS.cancelDelayedNamedTrigger]: {
			name: 'Cancel Delayed Named Trigger',
			description: 'Cancels a named trigger that is waiting on a delay — useful to abort the "hide BTT then act" chain.',
			options: [{ type: 'textinput', id: 'triggerName', label: 'Trigger name', default: '', useVariables: true }],
			callback: async (event) => {
				const triggerName = str(event.options.triggerName)
				if (!triggerName) return
				await self.request('cancel_delayed_named_trigger_execution', { trigger_name: triggerName }, `cancel "${triggerName}"`)
			},
		},
	}
}

function floatingMenuOption() {
	return {
		type: 'textinput',
		id: 'menuName',
		label: 'Floating menu name (as named in BTT)',
		tooltip: 'The menu\'s name in BTT\'s Floating Menus list, e.g. "CompanionUI".',
		default: '',
		useVariables: true,
	}
}

async function runFloatingMenu(self, event, actionType, verb) {
	const menuName = str(event.options.menuName)
	if (!menuName) {
		self.log('warn', `Floating Menu ${verb}: no menu name given, nothing sent.`)
		return
	}
	const json = JSON.stringify({
		BTTPredefinedActionType: actionType,
		BTTAdditionalActionData: { BTTMenuActionMenuID: menuName },
	})
	const ok = await self.request('trigger_action', { json }, `${verb} floating menu "${menuName}"`)
	if (ok) {
		self.floatingMenuShown.set(menuName, actionType === BttActionType.ShowFloatingMenu)
		self.checkFeedbacks('floating_menu_shown')
	}
}
