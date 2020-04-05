var instance_skel = require('../../instance_skel');
var debug;
var log;

function instance(system, id, config) {
	var self = this;

	// super-constructor
	instance_skel.apply(this, arguments);

	self.actions(); // export actions

	return self;
}

instance.prototype.updateConfig = function(config) {
	var self = this;

	self.config = config;

	self.actions();
}

instance.prototype.init = function() {
	var self = this;

	self.status(self.STATE_OK);

	debug = self.debug;
	log = self.log;
}

// Return config fields for web config
instance.prototype.config_fields = function () {
	var self = this;
	return [
		{
			type: 'text',
			id: 'info',
			width: 12,
			label: 'Information',
			value: 'http://x.x.x.x<br>[port]'
		},
		{
			type: 'textinput',
			id: 'prefix',
			label: 'BTT URL',
			width: 12
		},
		{
			type: 'textinput',
			id: 'port',
			label: 'port',
			width: 12
		}
	]
}

// When module gets deleted
instance.prototype.destroy = function() {
	var self = this;
	debug("destroy");
}

instance.prototype.actions = function(system) {
	var self = this;
	var urlLabel = 'UUID';

	if ( self.config.prefix !== undefined ) {
		if ( self.config.prefix.length > 0 ) {
			urlLabel = 'UUID';
		}
	}

	self.setActions({
		'uuid': {
			label: 'uuid',
			options: [
				{
					type: 'textinput',
					label: urlLabel,
					id: 'uuid_url',
					default: '',
				}
			]
		}
	});
}

instance.prototype.action = function(action) {
	var self = this;
	var cmd;

	if ( self.config.prefix !== undefined && action.options.uuid_url.substring(0,4) != 'http' ) {
		if ( self.config.prefix.length > 0 ) {
			cmd = self.config.prefix + ':'+ self.config.port + '/execute_assigned_actions_for_trigger/?uuid='	+	action.options.uuid_url;
		}
		else {
			cmd = action.options.uuid_url;
		}
	}
	else {
		cmd = action.options.uuid_url;
	}

if (action.action == 'uuid') {

		self.system.emit('rest_get', cmd, function (err, result) {
			if (err !== null) {
				self.log('error', 'HTTP GET Request failed (' + result.error.code + ')');
				self.status(self.STATUS_ERROR, result.error.code);
			}
			else {
				self.status(self.STATUS_OK);
			}
		});
	}
}

instance_skel.extendedBy(instance);
exports = module.exports = instance;
