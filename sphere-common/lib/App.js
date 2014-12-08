'use strict';

var _ = require('underscore');
var checksum = require('checksum');
var path = require('path');
var pkgInfo = require('pkginfo');
var util = require('util');

var JSONServiceBinder = require('./JSONServiceBinder');

/**
 * @class App
 */

/**
 * The app name.
 *
 * e.g.
 *
 * ```com.ninjablocks.myapp```
 *
 * @property {String} name
 */

/**
 * @property {String} filename
 * @readonly
 */

/**
 * @property {Logger} log
 * @readonly
 */

function App() {}

function addReadOnlyProp(o, name, value, enumerable) {
  Object.defineProperty(o, name, {writable:false, value:value, enumerable:enumerable, configurable:false});
}

/*
 * Most of the functions and properties are added once the name is set in the subclass
 * XXX: This is all a little... magic. But it does make apps extremely simple.
 */
Object.defineProperty(App.prototype, 'name', {
  set: function(value) {
    addReadOnlyProp(this, 'name', value, true);
    addReadOnlyProp(this, 'filename', getCallerFilename(), true);
    addReadOnlyProp(this, '_appType', this._appType || 'app');
    addReadOnlyProp(this, 'log', Ninja.getLog('['+this._appType+'] ' + value));
    //addReadOnlyProp(this, 'store', Ninja.getStore(value));
    addReadOnlyProp(this, 'bus', Ninja.getBus(this.log));

    process.nextTick(this._init.bind(this));
  }
});


function getPackageInfo() {

  var info = {exports:{}};
  pkgInfo(info, {
    dir: path.dirname(process.cwd() + '/index.js'),
    include: ['name', 'author', 'description', 'version', 'license', 'id'] // Should we send topics?
  });
  return info.exports;
};

App.prototype._init = function() {

  // Start/stop lifecycle
  var self = this;

  if (this._appType === 'driver') {
    JSONServiceBinder.bind('/service/driver', this, null, Ninja.topics.driver.service.node(Ninja.nodeId).app(this.name), this.log, getPackageInfo());

    this.serviceValidators = Ninja.SchemaTools.getServiceValidators('/service/driver');
  }

  /*//*
  function onStart() {
    self.subscribe(self.topics.stop, function onStopApp(topic, cb) {
      self.log.info('-- Stopping --');
      self.unsubscribeAll();

      self.stop(function(err) {
        self.running = self.isLikeTotallyRunningRightNow = !!err;

        if (!self.running) {
          onStop();
        }
        cb(err, self.running);
      });

    });

  }

  function onStop() {
    self.subscribe(self.topics.start, function onStartApp(topic, config, cb) {

      self.log.info('-- Starting --');
      self.unsubscribeAll();

      self.start(config, function(err) {

        self.running = self.isLikeTotallyRunningRightNow = !err;

        if (self.running) {
          onStart();
        }
        cb(err, self.running);
      });

    });
  }

  onStop();

  // XXX: Force start for now
  this.start({}, function(err) {
    if (err) {
      self.log.error('Failed to start', err);
    }
  });*/

  function die() {

    try {
      self.stop(function() {
        self.log.info('Goodbye!');
        process.exit(0);
      });
    } catch(e) {
      self.log.error('Error stopping driver', e);
      process.exit(1);
    }

    setTimeout(function() {
      self.log.error('Forcing exit after 3 seconds');
      process.exit(1);
    }, 3000);
  }

  process.on('SIGTERM', die);
  process.on('SIGINT', die);
  process.on('uncaughtException', function(e) {
    console.error('Uncaught exception', e, e.stack);
    die();
  });

}


App.prototype.sendEvent = function(event, data) {

  if (!this.serviceValidators.events[event]) {
    this.log.warn(('Unknown event'.red + '. Event "' + event.yellow + '" doesn\'t exist for ' + this._appType + 's.'));
  } else {
    this.serviceValidators.events[event](data);
  }

  this.bus.publish(
    Ninja.topics[this._appType].event
      .node(Ninja.nodeId)
      .setParams({ driver: this.name, app: this.name })
      .event(event),
    data
  );
};

/**
 * Saves the provided object as the app's config. This config is given back at startup.
 * @param {Object} config The app configuration. Must be JSON serializable.
 * @param {Function} cb The callback from the save command
 * @param {String} cb.err If this is a string, there was an error saving the configuration
 */
App.prototype.saveConfig = function(config, cb) {
  this.log.info('Saving config', config);
  this.publish(this.topics.saveConfig, config, cb);
};

// Stolen from https://github.com/node-red/node-red/blob/master/red/nodes.js
// Copyright 2013 IBM Corp (Apache 2 License)
// TODO: Make this less magical?
function getCallerFilename(type) {
  //if (type == 'summary') {
  //    var err = new Error();
  //    console.log(err.stack);
  //    return null;
  //}
  // Save original Error.prepareStackTrace
  var origPrepareStackTrace = Error.prepareStackTrace;
  // Override with function that just returns `stack`
  Error.prepareStackTrace = function (_, stack) {
    return stack;
  };
  // Create a new `Error`, which automatically gets `stack`
  var err = new Error();
  // Evaluate `err.stack`, which calls our new `Error.prepareStackTrace`
  var stack = err.stack;
  // Restore original `Error.prepareStackTrace`
  Error.prepareStackTrace = origPrepareStackTrace;
  // Remove superfluous function call on stack

  // TODO: Make this less magical
  stack.shift();
  stack.shift();
  stack.shift();
  return stack[0].getFileName();
}

module.exports = App;
