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
			value: 'Connect to BTT with the IP and port, see help for more Information'
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'BTT IP address',
			width: 12,
			regex: self.REGEX_IP
		},
		{
			type: 'textinput',
			id: 'port',
			label: 'port',
			width: 12,
			regex: self.REGEX_PORT
		}
	]
}

// When module gets deleted
instance.prototype.destroy = function() {
	debug("destroy");
}

instance.prototype.actions = function(system) {
	var self = this;

	self.setActions({
		'uuid': {
			label: 'uuid',
			options: [
				{
					type: 'textinput',
					label: 'The UUID',
					id: 'uuid',
					default: '',
				}
			]
		}
	});
}

instance.prototype.action = function(action) {
	var self = this;
	var cmd;




if (action.action == 'uuid') {

		cmd = `http://${self.config.host}:${self.config.port}/execute_assigned_actions_for_trigger/?uuid=${action.options.uuid}`;

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
