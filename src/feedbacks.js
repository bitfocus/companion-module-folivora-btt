import { combineRgb } from '@companion-module/base'

export const FEEDBACK_IDS = {
	connectionOk: 'connection_ok',
	floatingMenuShown: 'floating_menu_shown',
}

export function buildFeedbacks(self) {
	return {
		[FEEDBACK_IDS.connectionOk]: {
			type: 'boolean',
			name: 'BTT is reachable',
			description: 'True while the last check of BTT\'s /get_info/ route succeeded.',
			defaultStyle: {
				bgcolor: combineRgb(0, 90, 0),
				color: combineRgb(255, 255, 255),
			},
			options: [],
			callback: () => self.connectionOk,
		},
		[FEEDBACK_IDS.floatingMenuShown]: {
			type: 'boolean',
			name: 'Floating menu is shown (as last set from Companion)',
			description:
				'True after this connection showed the named menu, false after it hid it. Companion cannot read BTT\'s real menu state, so this drifts if you also toggle the menu inside BTT.',
			defaultStyle: {
				bgcolor: combineRgb(0, 60, 120),
				color: combineRgb(255, 255, 255),
			},
			options: [
				{
					type: 'textinput',
					id: 'menuName',
					label: 'Floating menu name',
					default: '',
				},
			],
			callback: (feedback) => Boolean(self.floatingMenuShown.get(feedback.options.menuName)),
		},
	}
}
