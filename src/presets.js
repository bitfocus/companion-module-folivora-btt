import { combineRgb } from '@companion-module/base'
import { ACTION_IDS } from './actions.js'
import { FEEDBACK_IDS } from './feedbacks.js'

const WHITE = combineRgb(255, 255, 255)
const BLACK = combineRgb(0, 0, 0)
const DARK = combineRgb(20, 20, 20)
const BLUE = combineRgb(0, 60, 120)
const GREEN = combineRgb(0, 90, 0)
const RED = combineRgb(120, 0, 0)
const PURPLE = combineRgb(70, 30, 110)
const ORANGE = combineRgb(140, 70, 0)

/** Shorthand for a one-step button, which is all of these presets need. */
function step(...actions) {
	return [{ down: actions, up: [] }]
}

function act(actionId, options) {
	return { actionId, options }
}

/**
 * base 2.x splits presets in two: the definitions themselves, and a `structure`
 * describing how they are grouped in the UI. Both go to setPresetDefinitions().
 */
export function buildPresets() {
	const presets = {
		named_trigger: {
			type: 'simple',
			name: 'Named trigger (edit the name on the button)',
			keywords: ['trigger', 'named'],
			style: { text: 'BTT\nTrigger', size: '14', color: WHITE, bgcolor: BLUE },
			steps: step(act(ACTION_IDS.triggerNamed, { triggerName: 'MyTrigger', extraParams: '', async: false })),
			feedbacks: [],
		},

		named_trigger_with_variable: {
			type: 'simple',
			name: 'Named trigger + variable payload',
			keywords: ['trigger', 'variable'],
			style: { text: 'Trigger\n+ value', size: '14', color: WHITE, bgcolor: BLUE },
			steps: step(act(ACTION_IDS.triggerNamed, { triggerName: 'MyTrigger', extraParams: 'myVar=hello', async: false })),
			feedbacks: [],
		},

		trigger_uuid: {
			type: 'simple',
			name: 'Trigger by UUID (right-click a trigger in BTT to copy it)',
			keywords: ['uuid', 'trigger'],
			style: { text: 'BTT\nUUID', size: '14', color: WHITE, bgcolor: PURPLE },
			steps: step(act(ACTION_IDS.executeUuid, { uuid: '' })),
			feedbacks: [],
		},

		show_companion_ui: {
			type: 'simple',
			name: 'Show floating menu "CompanionUI"',
			keywords: ['floating', 'menu', 'webview'],
			style: { text: 'Show\nUI', size: '14', color: WHITE, bgcolor: GREEN },
			steps: step(act(ACTION_IDS.showFloatingMenu, { menuName: 'CompanionUI' })),
			feedbacks: [],
		},

		hide_companion_ui: {
			type: 'simple',
			name: 'Hide floating menu "CompanionUI"',
			keywords: ['floating', 'menu'],
			style: { text: 'Hide\nUI', size: '14', color: WHITE, bgcolor: RED },
			steps: step(act(ACTION_IDS.hideFloatingMenu, { menuName: 'CompanionUI' })),
			feedbacks: [],
		},

		toggle_companion_ui: {
			type: 'simple',
			name: 'Toggle floating menu "CompanionUI" (lit while shown)',
			keywords: ['floating', 'menu', 'toggle'],
			style: { text: 'Companion\nUI', size: '14', color: WHITE, bgcolor: DARK },
			steps: step(act(ACTION_IDS.toggleFloatingMenu, { menuName: 'CompanionUI' })),
			feedbacks: [
				{
					feedbackId: FEEDBACK_IDS.floatingMenuShown,
					options: { menuName: 'CompanionUI' },
					style: { bgcolor: BLUE, color: WHITE },
				},
			],
		},

		hide_btt_then_act: {
			type: 'simple',
			name: 'Dismiss BTT first, then act on your real window ("hidebtt" recipe)',
			keywords: ['window', 'hide', 'focus'],
			style: { text: 'Hide BTT\n→ act', size: '14', color: WHITE, bgcolor: ORANGE },
			steps: step(
				// Step 1: a BTT-side named trigger that hides BTT and delays 0.1s, so the
				// window action below lands on your original window, not BTT's.
				act(ACTION_IDS.triggerNamed, { triggerName: 'hidebtt', extraParams: '', async: false }),
				// Step 2: replace this with whatever window action you actually want.
				act(ACTION_IDS.triggerNamed, { triggerName: 'MyWindowAction', extraParams: '', async: false }),
			),
			feedbacks: [],
		},

		alfred_via_btt: {
			type: 'simple',
			name: 'Alfred workflow via a BTT named trigger',
			keywords: ['alfred'],
			style: { text: 'Alfred', size: '14', color: WHITE, bgcolor: combineRgb(60, 60, 130) },
			steps: step(act(ACTION_IDS.triggerNamed, { triggerName: 'alfred-action', extraParams: '', async: false })),
			feedbacks: [],
		},

		keyboard_maestro_via_btt: {
			type: 'simple',
			name: 'Keyboard Maestro macro via a BTT named trigger',
			keywords: ['keyboard maestro', 'macro'],
			style: { text: 'KM\nmacro', size: '14', color: WHITE, bgcolor: combineRgb(100, 50, 0) },
			steps: step(act(ACTION_IDS.triggerNamed, { triggerName: 'km-macro', extraParams: '', async: false })),
			feedbacks: [],
		},

		run_shortcut: {
			type: 'simple',
			name: 'Run an Apple Shortcut',
			keywords: ['shortcuts'],
			style: { text: 'Short-\ncut', size: '14', color: BLACK, bgcolor: combineRgb(210, 160, 40) },
			steps: step(act(ACTION_IDS.runShortcut, { name: 'My Shortcut', input: '', async: true })),
			feedbacks: [],
		},

		connection_status: {
			type: 'simple',
			name: 'BTT reachable indicator (green = healthy)',
			keywords: ['status'],
			style: { text: 'BTT\n$(btt:btt_version)', size: '14', color: WHITE, bgcolor: RED },
			steps: step(),
			feedbacks: [{ feedbackId: FEEDBACK_IDS.connectionOk, options: {}, style: { bgcolor: GREEN, color: WHITE } }],
		},

		test_connection: {
			type: 'simple',
			name: 'Test the connection (shows a macOS notification)',
			keywords: ['test'],
			style: { text: 'Test\nBTT', size: '14', color: WHITE, bgcolor: DARK },
			steps: step(act(ACTION_IDS.displayNotification, { title: 'Companion', text: 'BTT connection works.' })),
			feedbacks: [{ feedbackId: FEEDBACK_IDS.connectionOk, options: {}, style: { bgcolor: GREEN, color: WHITE } }],
		},
	}

	const structure = [
		{
			id: 'triggers',
			name: 'Triggers',
			description:
				'Fire BTT triggers. Prefer named triggers — a UUID changes if the trigger is recreated or you switch presets, and the button then fails silently.',
			definitions: ['named_trigger', 'named_trigger_with_variable', 'trigger_uuid'],
		},
		{
			id: 'floating_menus',
			name: 'Floating Menus / Companion on your Mac',
			description:
				'Show a BTT floating menu — for example one holding a web view of the Companion UI, so you get a minimal control window on the Mac itself. Includes the community "hide BTT first" recipe for window actions.',
			definitions: ['show_companion_ui', 'hide_companion_ui', 'toggle_companion_ui', 'hide_btt_then_act'],
		},
		{
			id: 'other_apps',
			name: 'Alfred, Keyboard Maestro & Shortcuts',
			description:
				'Reach other macOS automation tools. Alfred and Keyboard Maestro go through a BTT named trigger; Shortcuts has a direct action.',
			definitions: ['alfred_via_btt', 'keyboard_maestro_via_btt', 'run_shortcut'],
		},
		{
			id: 'status',
			name: 'Status & Testing',
			description: 'Confirm the connection works end to end, and keep an eye on it.',
			definitions: ['connection_status', 'test_connection'],
		},
	]

	return { structure, presets }
}
