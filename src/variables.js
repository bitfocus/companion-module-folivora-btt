/** base 2.x wants an object keyed by variable id, not an array. */
export function buildVariableDefinitions() {
	return {
		connection_state: { name: 'Connection state (Ok / error text)' },
		btt_version: { name: 'BetterTouchTool version' },
		base_url: { name: 'Base URL this connection targets' },
		last_action: { name: 'Last action sent to BTT' },
		last_error: { name: 'Last error message (empty when healthy)' },
	}
}

export function computeVariableValues(self) {
	return {
		connection_state: self.connectionState,
		btt_version: self.bttVersion,
		base_url: self.client.baseUrl,
		last_action: self.lastAction,
		last_error: self.lastError,
	}
}
