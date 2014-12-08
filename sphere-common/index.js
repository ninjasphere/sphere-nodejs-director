'use strict';

var _ = require('underscore');
var crypto = require('crypto');
var fs = require('fs');
var MQTT = require('mqtt');
var pkgInfo = require('pkginfo');
var util = require('util');

var Bus = require('./lib/Bus');
var config = require('./lib/config');
var Errors = require('./lib/Errors');
var JSONServiceBinder;
var JSONServiceProxy = require('./lib/JSONServiceProxy');
var Log = require('./lib/Log');
var TopicConfig = require('./lib/TopicConfig');
var Util = require('./lib/Util');

var moduleName = process.cwd().substring(process.cwd().lastIndexOf('/') + 1);

if (moduleName === 'driver-combined') {
  moduleName = 'drivers';
}

var mqttConnection;

var log = Log.getLogger(moduleName);

/**
 * @class Ninja
 * @singleton
 * @global
 */
var Ninja = global.Ninja = {

  /**
   * Rerefence to the Ninja Utilities
   *
   */
  Util: Util,
  /**
   * The node id of the local machine
   *
   * @property
   * @readonly
   */
  nodeId : config.nodeId || getSerialNumber() || 'unknown',


  /**
   * The latitude of the local machine
   *
   * @property
   * @readonly
   */
   latitude: config.latitude || '',

  /**
   * The longitude of the local machine
   *
   * @property
   * @readonly
   */
   longitude: config.longitude || '',

  /**
   * The configuration, loaded from env, cli and json files.
   *
   * The objects returned are 'frozen' and so cannot be altered by modules.
   *
   * @property config
   * @readonly
   */
  config: config,

  /**
   * Provides access to all the topics available to the current module.
   *
   *     this.publish(Ninja.topics.mydriver.device.id(id), device);
   *
   * @property
   * @readonly
   */
  topics: {},

  services: {},

  getService: (function() {
    var instances = {};
    return function(name) {
      var service = Ninja.services[name];
      if (!service) {
        throw new Error('Service "' + name + '" not known. Known services:' + Object.keys(Ninja.services).join(', '));
      }

      return instances[name] || (instances[name] = new JSONServiceProxy(service.schema, service.topic));
    };
  })(),

  /**
   * Mixes App into a class and registers it with the DriverManager
   *
   *     @example
   *
   *     function MyDriver() {
   *         this.name = 'com.ninjablocks.test.mydriver';
   *     }
   *     Ninja.driver(MyDriver);
   *
   * @method
   * @uses App
   */
  driver: function(Class) {
    util.inherits(Class, require('./lib/App'));
    Class.prototype._appType = 'driver';
  },

  /**
   * Mixes App into a class and registers it with the AppManager
   *
   *     @example
   *
   *     function MyApp() {
   *         this.name = 'com.ninjablocks.test.myapp';
   *     }
   *     Ninja.driver(MyApp);
   *
   * @method
   * @uses App
   */
  app: function(Class) {
    util.inherits(Class, require('./lib/App'));
  },

  /**
   * Mixes Device into a class and registers it with the DriverManager
   *
   *     @example
   *
   *     function MyZigBeeDevice(config) {
   *         Ninja.registerDevice(this, config);
   *     }
   *
   * @method
   * @uses Device
   */
  device: function(Class) {
    util.inherits(Class, require('./lib/Device'));
  },

  /**
   * Creates and returns a new MQTT bus
   *
   * @method
   * @param {String|Log} name The name (usually the class using the bus) or the parent's Log.
   * @return {Bus}
   */
  getBus: function(name) {
    if (!mqttConnection) {

      var log = Ninja.getLog('MQTT'.yellow);

      var config = JSON.parse(JSON.stringify(Ninja.config.mqtt.config));
      config.clientId = moduleName;
      log.debug('Connecting to MQTT server %s:%s', Ninja.config.mqtt.host, Ninja.config.mqtt.port, config);

      mqttConnection = MQTT.createClient(Ninja.config.mqtt.port, Ninja.config.mqtt.host, config);

      mqttConnection.on('connect', function() {
        log.debug('Connected');
      });

      mqttConnection.on('close', function() {
        log.warn('Disconnected');
        process.exit(0)
      });

      mqttConnection.setMaxListeners(666);
    }

    return new Bus(name, mqttConnection, Ninja.config.mqtt.trace);
  },

  getServiceProxy: function(serviceUri, topic) {
    return new JSONServiceProxy(serviceUri, topic);
  },

  bindService: function(serviceUri, target, topic, parentLog) {
    if (!JSONServiceBinder) {
      JSONServiceBinder = require('./lib/JSONServiceBinder');
    }

    return JSONServiceBinder.bind(serviceUri, target, null, topic, parentLog);
  },

  /*
   * Creates and returns a new Log, with the first category being the current module name
   *
   * @method
   * @param {String} category The category
   * @return {Bus}
   */
  getLog: (function() {
    var log = Log.getLogger(moduleName);

    return function(category) {
      return log.extend(category);
    };
  })(),

  /**
   * Creates and returns a new Store.
   * In production it will return a FileStore.
   * In testing this is likely to be a MemoryStore.
   *
   * @method
   * @param {String} name The name (usually the class using the bus), used for logging.
   * @param {Function} cb Called with the store when it is ready to use
   * @param {Store} cb.store The store

  getStore: function(name, cb) {
    // TODO: This should return different store implmentations
    //       (mqtt-backed for drivers?) depending on environment.
    return new Store(__dirname + '/stores/' + name + '.db', cb);
  },*/


  /**
   * Return an error object based on the error ID
   *
   * @method
   * @param {String} errId The error ID for the error
   */
  getError: function(errId) {
    return new NinjaError(errId,Errors[errId].status,Errors[errId].message);
  },

  /**
   * Just removes any characters that don't match [a-zA-Z0-9-_.]
   *
   * @method
   * @param {String} input The string to be made safe
   * @returns {String} The identifier which is safe to use as an identifier (e.g for devices)
   */
  safeId: function(input) {
    if (typeof input !== 'string') {
      return '-BAD_IDENTIFIER-';
    }
    return (input+'').replace(/[^a-zA-Z0-9-_\.]/g, '');
  },

  guid: function(idType, id) {
    return Ninja.hash(idType + '.' + this.safeId(id));
  },

  hash: function(value) {
    return crypto.createHash('sha').update(value).digest('hex').substring(0, 10);
  }

};

Object.defineProperty(Ninja, 'Driver', {
  get: function() {
    return require('./lib/Driver');
  }
});

Object.defineProperty(Ninja, 'Device', {
  get: function() {
    return require('./lib/Device');
  }
});

Object.defineProperty(Ninja, 'Sphere', {
  get: function() {
    return Ninja._sphere || (Ninja._sphere = require('./lib/sphere-api/Sphere'));
  }
});

// This getter only runs once, and means
// a) It isn't loaded into memory unless needed and
// b) The Ninja object is available to it
Object.defineProperty(Ninja, 'SchemaTools', {
  configurable: true,
  get: function() {
    var tools;
    try {
      tools = require('../sphere-schemas').Tools;
    } catch (e) {
      tools = require('sphere-schemas').Tools;
    }

    Object.defineProperty(Ninja, 'SchemaTools', {value: tools});

    return tools;
  }
});

if (config.logMemory) {
  var log = Ninja.getLog('[MEMORY]', 'red');
  var memwatch = require('memwatch');
  var hd;

  memwatch.on('leak', function(info) {
    log.info('Leak', info);
  });

  memwatch.on('stats', function(stats) {
    log.info('Stats', stats);
    if (hd) log.info('Diff', util.inspect(hd.end(), {colors:true, depth:null}));
    hd = new memwatch.HeapDiff();
  });
}

module.exports = Ninja;

if (Ninja.config.echoConfig) {
  Ninja.getLog('Config').info('Configuration\n', util.inspect(Ninja.config, {colors:true}));
}

addPackageJson(__dirname); // From sphere-common
addPackageJson(process.cwd()); // From a driver/module/etc.

function addPackageJson(dir) {
  try {
    var info = {exports:{}};
    pkgInfo(info, {
      dir: dir,
      include: ['topics', 'services']
    });
    Ninja.services = _.extend({}, info.exports.services, Ninja.services);
    Ninja.topics = _.extend({}, TopicConfig.apply(info.exports.topics), Ninja.topics);
  } catch(e) {
    //console.log('XXX - Failed to find package.json in directory', dir);
  }
}

function getSerialNumber() {
  try {
    var sn = fs.readFileSync('/proc/cmdline',{encoding:'utf8'}).split('hwserial=')[1].substr(0,16);
    return Util.b32encode(new Buffer(sn,'hex').toString('binary')).replace(/=+$/g,'');
  } catch(e) {
    return null;
  }
}


function NinjaError(id,status,message) {
  this.id = id;
  this.message = message;
  this.status = status;
}
NinjaError.prototype = Error;

// XXX: FIXME should be somewhere else
var zoneFile = '/usr/share/zoneinfo/zone.tab';
var tzFile = '/etc/timezone';

if (fs.existsSync(tzFile) && fs.existsSync(zoneFile)) {
  var zoneData = fs.readFileSync(zoneFile,{encoding:'utf8'});
  var timezone = fs.readFileSync(tzFile,{encoding:'utf8'}).replace(/\n/,'');

  var lookupArray = zoneData.split(/[\n\t]/);
  var index = lookupArray.indexOf(timezone);

  if (index===-1) {
    return;
  }

  var latLongStr = lookupArray[index-1];
  var lat;

  var lat = parseInt(latLongStr);
  var lon = parseInt(latLongStr.replace((lat>0)?'+'+lat:lat,''));

  Ninja.latitude = lat/100;
  Ninja.longitude = lon/100;

  zoneData = lookupArray = null;
}


// XXX: FIXME should only be included on developer kits, as well as made user configurable
if (Ninja.config.bugsnagKey) {
  var bugsnag = require("bugsnag");
  var os = require('os');

  var getPackageJson = function(dir) {
    var packageJson = {exports:{}};
    pkgInfo(packageJson, {
      dir: dir
    });
    return packageJson;
  };

  var cleanConfig = JSON.parse(JSON.stringify(config));
  cleanConfig.token = cleanConfig.token?'[EXISTS]':null;

  bugsnag.register(Ninja.config.bugsnagKey, {
    autoNotify: false,
    userId: cleanConfig.userId,
    logger: Ninja.getLog('BugSnag')
  });

  process.on('uncaughtException', function(e) {

    bugsnag.metaData = {
      severity: 'error',
      "User": {
        serial: Ninja.nodeId,
      },
      "Host": {
        platform: process.platform,
        arch: process.arch,
        hostname: os.hostname(),
        uptime: os.uptime(),
        freemem: os.freemem(),
        totalmem: os.totalmem(),
        cpus: os.cpus()
      },
      "Node.JS": process.versions,
      "Memory Usage": process.memoryUsage(),
      "Config": cleanConfig,
      "Application": {
        module: getPackageJson(process.cwd()),
        common: getPackageJson(__dirname)
      }
    };

    return bugsnag.notify(e);
  });

  Ninja.getLog('BugSnag').info('Starting...');

};
