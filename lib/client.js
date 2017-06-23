'use strict'

var fs = require('fs');
var mqtt = require('mqtt');
var exec = require('child_process').exec;

var client = function(configFile){
	if (configFile === undefined) {
		throw new Error('No config file specified.');
	}
	this.configFile = configFile;
	this.onConnectCalled = false;
}

function regexQuote(str) {
	return (str+'').replace(/[.?*+^$[\]\\(){}|-]/g, '\\$&');
}

function template( template, data ){
	return (template || '').replace(
		/\${(\w*)}/g,
		function( m, key ){
			return data.hasOwnProperty( key ) ? data[ key ] : '';
		});
}

client.prototype.init = function() {
	var that = this;
	return new Promise(function (resolve, reject) {
		fs.readFile(that.configFile, 'utf8', function (err, data) {
			if (err) return reject(err) // rejects the promise with `err` as the reason
			resolve(data)	       // fulfills the promise with `data` as the value
		})
	}).then(function(data) {
		that.config = JSON.parse(data);
		that.config.subs = that.config.subs || {};
		Object.keys(that.config.subs).forEach(function(key) {
			var val = that.config.subs[key];
			if (typeof val === 'string') {
				val = { exec: val };
			}
			var match = regexQuote(key);
			val.match = null;
			if (match.indexOf('\\+') >= 0 || match.indexOf('#') >= 0) {
				match = match.replace('\\+', '[^/]*').replace('#', '.*');
				console.log('Creating regex for ' + key + ' as ' + match);
				val.match = new RegExp(match);
			}
			that.config.subs[key] = val;
		});
		that.client = mqtt.connect(that.config.url, that.config.connect_options);
	});
};

client.prototype.publish = function(topic, message) {
	var that = this;
	return that.init().then(function() {
		that.client.publish(topic, message);
	});
};

client.prototype._onConnect = function() {
	var that = this;
	that.onConnectCalled = true;
	var keys = Object.keys(that.config.subs);
	console.log('Calling client.subscribe(' + keys + ')');
	that.client.subscribe(keys);
};

client.prototype._onMessage = function(topic, buffer) {
	var that = this;
	var message = buffer.toString();
	var matching = [];
	var subs = that.config.subs;
	Object.keys(subs).forEach(function(key) {
		var val = subs[key];
		if ((key === topic) || (val.match !== null && val.match.test(topic))) {
			matching.push(val);
		}
	});

	if (matching.length === 0) {
		return;
	}

	console.log('Received message for topic ' + topic);

	var data = { message: message, topic: topic };
	matching.forEach(function(val) {
		var execCommand = template(val.exec, data);

		function puts(error, stdout, stderr) {
			if (stdout) {
				process.stdout.write('stdout: ' + stdout);
			}
			if (stderr) {
				process.stdout.write('stderr: ' + stderr);
			}
			if (error !== null) {
				console.log('exec error: ' + error);
			}
		}
		console.log('Executing command ' + execCommand);
		try {
			exec(execCommand, puts);
		} catch (e) {
			console.log(e);
		}
	});
};

client.prototype._onError = function(error) {
	var that = this;
	console.log('mqtt client error: ' + error);
};

client.prototype.stopServer = function() {
	var that = this;
	if (that.client) {
		that.client.end();
	}
};

client.prototype.runServer = function() {
	var that = this;

	console.log('Init...');
	return that.init().then(function() {
		console.log('Setting up event handlers');
		setInterval(function() {
			if (!that.onConnectCalled || !that.client.connected) {
				console.log('We don\'t seem to be connected to the mqtt broker. Wrong address?');
			}
		}, 30000);
		that.client.on('connect', that._onConnect.bind(that));
		that.client.on('message', that._onMessage.bind(that));
		that.client.on('error', that._onError.bind(that));
	});
};

module.exports = { Client: client };
