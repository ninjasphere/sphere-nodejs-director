'use strict';

var _ = require('underscore');
var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var humanizeDuration = require('humanize-duration');
var kid_process = require('kid_process');
var path = require('path');
var usage = require('usage');
var util = require('util');

function Director() {
  var log = this.log = Ninja.getLog('Director');

  log.info('Starting up. PID:' + process.pid);

  var bus = this.bus = Ninja.getBus(log);

  this.modulePaths = _.filter(Ninja.config.director.module_paths, fs.existsSync);

  if (!this.modulePaths.length) {
	this.modulePaths = [path.resolve('..'), path.resolve('../drivers'), path.resolve('../apps')];
    log.warn('No module paths defined, or none exist (provided: "%s"). Using the parent directory "%s"',
      Ninja.config.director.module_paths.join(', '), this.modulePaths.join(', '));
  }

  bus.subscribe(Ninja.topics.module.start, function onStartModule(topic, name) {
    log.info('Start', name.yellow, 'requested via mqtt');
    this.startModule(name);
  }.bind(this));

  bus.subscribe(Ninja.topics.module.stop, function onStopModule(topic, name) {
    log.info('Stop', name.yellow, 'requested via mqtt');
    this.stopModule(name);
  }.bind(this));

  bus.subscribe(Ninja.topics.site.change, function() {
    setTimeout(function() {
      this.announceAvailableModules();
    }.bind(this), 2000); // UUURGH FIXME!
  }.bind(this));

  this.processes = {};

  // Emit CPU and memory usage
  var statsInterval = setInterval(function() {
    Object.keys(this.processes).forEach(function(name) {
      if (!this.processes[name]) {
        return;
      }
      usage.lookup(this.processes[name].pid, {
        keepHistory: true
      }, function(err, stat) {
        var proc = this.processes[name];
        if (err) {
          return log.error('Failed to get process stats', name, err);
        }
        bus.publish(Ninja.topics.module.status.node(Ninja.nodeId), name, stat);
        if (proc && proc.packageInfo.maxMemory && process.platform == 'linux') {
          if (stat.memory > (proc.packageInfo.maxMemory * 1000000)) {
            log.info(name, 'is using too much memory. Current:', (stat.memory+'').yellow,
              'Max:', proc.packageInfo.maxMemory, 'mb');

            proc.kill();
          }
        }
      }.bind(this));
    }.bind(this));
  }.bind(this), 10000);

  // Kill all child processes when we're shutting down
  var killChildren = function(e) {
    console.log('**** Director process killed (I\'m meeellllting). Killing child processes.', e ? e.stack : '');

    clearTimeout(statsInterval);
    this.dead = true;
    var stopping = 0;

    Object.keys(this.processes).forEach(function(name) {
      try {
        if (this.processes[name]) {
          this.processes[name].removeAllListeners('terminated');
          this.processes[name].kill();
          this.processes[name].on('terminated', function() {
            console.log('  ' + name + ' - Terminated.');
            stopping--;
          });

          stopping++;
        }
      } catch (e) {
        console.log('     - FAILED'.green, ' killing process : ' + name, e);
      }
    }.bind(this));

    console.log(('Stopping ' + stopping + ' processes.').underline);

    setInterval(function() {
      if (stopping === 0) {
        console.log('All stopped.'.green + ' Quitting.');
        process.exit(0);
      } else {
        console.log(stopping + ' processes still stopping...');
      }
    }, 500);

    setTimeout(function() {
      process.exit(1);
    }, 30000);

  }.bind(this);

  process.on('SIGTERM', killChildren);
  process.on('SIGINT', killChildren);
  process.on('uncaughtException', killChildren);

  this.updateModules();

}
util.inherits(Director, EventEmitter);

Director.prototype.stopModule = function(name) {
  if (this.processes[name]) {
    this.processes[name].removeAllListeners('terminated');
    this.processes[name].kill();
    this.processes[name] = null
  }
};

// XXX: I REALLY shouldn't be writing this. Replace it with something. Anything.
// TODO: Add a callback? How do we define success?
Director.prototype.startModule = function(name, startTime, attempt) {

  this.log.trace('startModule', name, startTime, attempt);

  startTime = startTime || new Date().getTime();
  attempt = attempt || 1;

  this.log.info('Starting', name.yellow,
    'Attempt', (attempt + '').green, 'since it was first started', (humanizeDuration(new Date().getTime() - startTime) +
      ' ago').green);

  // TODO: Use this.modules instead of searching again
  var path = this.findModulePath(name);

  if (!path) {
    throw new Error('Module was not found in search paths "' + Ninja.config.director.module_paths.join(',') + '"');
  }

  var packageInfo;
  try {
    packageInfo = require(path + '/package.json');
  } catch (e) {
    throw new Error('Module package.json was not loadable from "' + path + '". ' + e.message);
  }

  this.log.info('Starting', name.yellow, 'version', packageInfo.version, 'from path', path.green);

  if (this.processes[name]) {
    this.log.info('Process already running, ignoring.');
    return;
  }

  if (packageInfo.maxMemory) {
    this.log.info('Maximum memory for', name.yellow, 'is', (packageInfo.maxMemory + 'mb').yellow);
  }

  var proc = kid_process.play(path + '/' + (packageInfo.main || 'run.js'), process.argv.slice(2), {
    cwd: path
  });

  if (packageInfo.main && packageInfo.main.indexOf('.js') < 0) {
    var log = Ninja.getLog(name);
    // Probably a go process...
    proc.stdout.on('data', function (data) {
      log.info(data.toString());
    });

    proc.stderr.on('data', function (data) {
      log.error(data.toString());
    });
  }

  proc.on('terminated', function() {
    this.log.info('Module', name.yellow, 'was terminated unexpectedly. pid:', (proc.pid + '').green);
    this.processes[name] = null;


    var delay = 0;

    if (attempt > 1) {
      delay = Math.pow(1.5, attempt) * 1000;
      delay = Math.min(240000, delay); // Maximum delay 240sec (about 14 attempts)

      this.log.info('Module', name.yellow, 'has died', (attempt+'').green, 'times. Delaying restart by ', (delay+'').yellow,'ms');
    }

    setTimeout(function() {
      if (!this.dead) {
        this.startModule(name, startTime, attempt + 1);
      }
    }.bind(this), delay);
  }.bind(this));

  proc.packageInfo = packageInfo;

  this.processes[name] = proc;

  this.log.debug('Launched module', name.yellow, 'with pid ' + (proc.pid + '').green);
};

Director.prototype.findModulePath = function(name) {
  this.log.debug('Finding path for module', name);

  return _.chain(this.modulePaths).map(function(path) {
    return path + '/' + name;
  }).find(function(path) {
    return fs.existsSync(path);
  }).value();
};

Director.prototype.announceAvailableModules = function() {

  var modules = {};

  for (var name in this.modules) {
    //   We only care about the first \/  place the module is installed... as it overrides any others
    modules[name] = this.modules[name][0].version;
  }

  this.bus.publish(Ninja.topics.module.available.node(Ninja.nodeId), modules);
};

Director.prototype.updateModules = function() {
  var log = this.log;

  log.debug('Updating local module list');
  var modules = _.chain(this.modulePaths).reverse().map(function(path) {
    log.trace('Checking module path', path);
    var found = fs.readdirSync(path).map(function(modulePath) {
      try {
        var info = require(path + '/' + modulePath + '/package.json');
        // TODO: It has a package.json, doesn't make it a module
        info.path = path + '/' + modulePath;
        return info;
      } catch (e) {
        // Not a module.
      }
    }).filter(function(x) {
      return x;
    });
    log.trace('Found in %s:', path, _.pluck(found, 'name').join(', ').green);

    return found;
  }).value();

  // TODO: Check if any have changed?
  this.modules = _.groupBy(_.union.apply(_, modules), 'name');

  // TODO: Any validation of found modules? Should at least check a 'ninja' field in package.json?
};

module.exports = Director;
