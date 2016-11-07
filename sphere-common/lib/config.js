'use strict';

var _ = require('underscore');
var flat = require('flat');
var fs = require('fs');
var merge = require('merge');
var path = require('path');

var log = require('./Log').getLogger('Config');

var opts = require('optimist').argv;

var env = Object.keys(opts).filter(function(name) {
  return opts[name] === true;
});

var envVars = {};
Object.keys(process.env).forEach(function(key) {
  if (key.match(/^sphere_/i)) {
    envVars[key.substring(7).replace(/_/g, '.')] = process.env[key];
  }
});

if (envVars.debug === 'true') {
  env.push('debug');
}

if (env.length) {
  //log.info('Environments:', env.join(', '));
}

/**
 * Configuration environments can be provided on the cli without a value ('--cloud-production')
 * A configuration file is loaded for each environment from common and the current module.
 *
 * Note: Only use alphanumeric characters for config property names
 *
 * Ordering of configuration searching:
 *
 * 1. Command-line arguments (nested using period)
 *
 * ```./start.sh --mqtt.port 1884```
 *
 * 2. Environment vars (must start with "sphere_", nested using underscore)
 * ```sphere_mqtt_port=1884 ./start.sh```
 *
 * 3. Home directory environment config
 * ```~/.sphere/[ENVIRONMENT].json```
 *
 * 4. Home directory default config
 * ```~/.sphere/default.json```
 *
 * 5. CWD (module) environment config
 * ```[CWD]/config/[ENVIRONMENT].json```
 *
 * 6. CWD (module) default config
 * ```[CWD]/config/default.json```
 *
 * 7. sphere-common environment config
 * ```sphere-common/config/[ENVIRONMENT].json```
 *
 * 8. sphere-common default config
 * ```sphere-common/config/default.json```
 *
 * 9. sphere-common credentials config
 * ```sphere-common/config/credentials.json```
 *
 * TODO: Support underscore nesting in CLI args
 */


// Configuration sources from are listed from least important (sphere-common/config/default.json) to most (CLI args)
// TODO: Correct ordering?
var configFiles = [];

function getUserHome() {
  return process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
}

function addIfExists(path) {
  if (fs.existsSync(path)) {
    configFiles.push(path);
  }
}

// sphere-common default config
addIfExists(path.join(__dirname, '..', '..', 'config', 'default.json'));

// sphere-common credentials config
addIfExists(path.join(__dirname, '..', '..', 'config', 'credentials.json'));

// sphere-common environment(s) config
env.forEach(function(e){
  addIfExists(path.join(__dirname, '..', '..', 'config', e + '.json'));
});

// current module default config
addIfExists(path.join(process.cwd(), 'config', 'default.json'));

// current module environment(s) config
env.forEach(function(e){
  addIfExists(path.join(process.cwd(), 'config', e + '.json'));
});

uh = getUserHome()
if uh {
  // home directory default config
  addIfExists(path.join(getUserHome(), '.sphere', 'default.json'));

  // home directory environment(s) config
  env.forEach(function(e){
    addIfExists(path.join(getUserHome(), '.sphere', e + '.json'));
  });
}

// credentials file
addIfExists(path.join('/','etc', 'opt', 'ninja', 'credentials.json'));
addIfExists('/data/etc/opt/ninja/credentials.json');

// Read the config files
var sources = configFiles.map(function(path) {
  try {
    return require(path);
  } catch(e) {
    var c = {};
    c['Failed Reading ' + path] = e.message;
    return c;
  }
});

// env vars (if starting with "sphere_")
sources.push(envVars);

// cli overrides
sources.push(opts);

var merged = merge.apply(null, sources.map(flat.flatten));
for (var prop in merged) {
  if (merged[prop] === 'false') {
    merged[prop] = false;
  } else if (merged[prop] === 'true') {
    merged[prop] = true;
  }
}

var config = flat.unflatten(merged);
config.sources = configFiles;
config.env = env;
config.installDirectory = path.join(__dirname, '..', '..');

function makeUnwritable(o) {
  Object.freeze(o);
  Object.keys(o).forEach(function(key) {
    if (typeof o[key] === 'object') makeUnwritable(o[key]);
  });
  return o;
}

module.exports = makeUnwritable(config);
