'use strict';

var fs = require('fs');
var service = require('os-service');
var path = require('path');
var sanitize = require('sanitize-filename');
var replaceExt = require('replace-ext');

var serviceName = 'mqtt-service';
var scriptPath = process.argv[1];

var ArgumentParser = require('argparse').ArgumentParser;
var parser = new ArgumentParser({
	version: '1.0.0',
	addHelp: true,
	description: 'A simple content-based MQTT service'
});
parser.addArgument(
	'--add',
	{
		nargs: 2,
		help: 'Creates a service with the specified name and config file (admin rights required)',
		metavar: ['NAME', 'CONFIGFILE']
	}
);
parser.addArgument(
	'--remove',
	{
		nargs: 1,
		help: 'Removes a service with the specified name (admin rights required)',
		metavar: ['NAME']
	}
);
parser.addArgument(
	'--run',
	{
		nargs: 2,
		help: 'Run the service with the specified config file',
		metavar: ['NAME', 'CONFIGFILE']
	}
);
parser.addArgument(
	'--username',
	{
		nargs: 1,
		help: 'When creating the service, use this as the username to run under',
		metavar: ['USERNAME']
	}
);
parser.addArgument(
	'--password',
	{
		nargs: 1,
		help: 'When creating the service, use this as the password to run under',
		metavar: ['PASSWORD']
	}
);
parser.addArgument(
	'--help-config',
	{
		nargs: 0,
		help: 'Show a sample config file'
	}
);
var args = parser.parseArgs();

if (args.help_config) {
	var sample_config = {
		url: 'mqtt://myserver:1883',
		connect_options: {
			username: 'my_user',
			password: 'my_pass'
		},
		subs: {
			'my/topic/1': 'command.sh ${topic} \'${message}\'',
			'my/topic/2': 'command.sh ${topic} \'${message}\'',
			'my/wildcard/onelevel/+': 'command.sh ${topic} \'${message}\'',
			'my/wildcard/all/#': 'command.sh ${topic} \'${message}\''
		}
	};
	console.log(JSON.stringify(sample_config, null, 4));
	return;
}

if (args.add !== null) {
	var name = args.add[0];
	var config = args.add[1];
	var options = {
		programArgs: ['--run', name, config]
	};

	if (args.username)
		options.username = args.username;

	if (args.password)
		options.password = args.password;

	service.add(name, options, function(error) {
		if (error)
			console.error(error.toString());
	});
	return;
}

if (args.remove !== null) {
	var name = args.remove[0];
	service.remove(name, function(error) {
		if (error)
			console.error(error.toString());
	});
	return;
}

if (args.run !== null) {
	var name = args.run[0];
	var config = args.run[1];

	var client = require('./lib/client');
	var cl = new client.Client(config);
	var logPath = replaceExt(config, '.' + sanitize(name) + '.log');
	var logStream = fs.createWriteStream(logPath);
	service.run(logStream, function() {
		console.log('Stopping service ' + name + '...');
		cl.stopServer();
		service.stop(0);
	});

	cl.runServer().catch(function(err) {
		console.log('Error occurred in service: ' + err);
		try { cl.stopServer(); }
		catch(e) { }
		service.stop(1);
	});
	console.log('Started service ' + name + '...');
}

parser.printHelp();
