'use strict';

var _ = require('underscore');
var addTimeout = require('addTimeout');
var checksum = require('checksum');
var colors = require('colors');
var crypto = require('crypto');
var EventEmitter = require('events').EventEmitter;
var mqtt = require('mqtt');
var path = require('path');
var util = require('util');

var Log = require('./Log');
var JSONServiceBinder = require('./JSONServiceBinder');

/**
 * Base class for all devices in Sphere.
 *
 * @class
 */
function Device() {
}

Device.prototype._init = function() {


  var self = this;

  if (!this.driver || typeof this.id === 'undefined' || !this.idType) {
    throw new Error('You must provide values for "driver", "id" and "idType" properties in your device.');
  }

  console.log('xxxxx', this, this.guid)

  var announcement = {
    id: this.guid,
    naturalId: this.id,
    naturalIdType: this.idType,
    name: this.name,
    signatures: this.signatures || {}
  };

  var bus = Ninja.getBus(this.log);

  var result = JSONServiceBinder.bind('/service/device', this, {}, '$device/' + this.guid, this.log, announcement);


  this.sendEvent = function(channel, event, data) {

    if (!protocols[channel]) {
      throw new Error('Unknown channel : ' + (channel+'').yellow);
    }

    var validators = Ninja.SchemaTools.getServiceValidators('/protocol/' + protocols[channel]);

    validators.events[event](data);

    bus.publish(
      Ninja.topics.device.channel.event
        .device(self.guid)
        .channel(channel)
        .event(event),

      data
    );
  };

  this.sendState = function(channel, data) {
    this.sendEvent(channel, 'state', data);
  };

  /*this.saveConfig = function(config, cb) {
    self.publish(Ninja.topics.device.saveConfig.device(self.guid).protocol(protocol), config, cb);
  };*/

  var channels = new EventEmitter();
  var protocols = {};
  var channelIds = {};
  var channelProxies = {};

  this.announceChannel = function(channel, protocol, mapping, handlers) {


    if (!channel) {
      throw new Error('You must provide at least a protocol for this channel.');
    }

    if (typeof protocol === 'object') {
      handlers = mapping;
      mapping = protocol;
      protocol = channel;
    }

    if (!protocol) {
      protocol = channel;
    }

    if (!handlers) {
      handlers = self;
    }

    if (protocol.indexOf('http://') > 0) {
      self.log.warn('Non-ninja protocols aren\'t supported yet. Unknown: ' + protocol);
    }

    protocols[channel] = protocol;

    self.log.debug('Announcing channel', channel, 'protocol', protocol);

    var channelId = channel;//Ninja.hash(self.driver.id + channel);
    channelIds[channelId] = channel;

    var topic = Ninja.topics.device.channel.service.device(self.guid).channel(channelId);

    var channelAnnouncement = {
      id: channelId,
      protocol: protocol
    };

    var result = JSONServiceBinder.bind('/protocol/' + protocol, handlers, mapping, topic, handlers.log || this.log, channelAnnouncement);

    channelProxies[channel] = result.proxy;

  };

  //bus.publish(Ninja.topics.device.announce.device(self.guid), announcement);

  if (this.startBatch && this.endBatch) {
    this.log.trace('Device implements batching');
    this.setBatch = function(state, cb) {
      this.log.debug('Starting batch with state', state);

      this.startBatch();

      var results = {};

      Object.keys(state).forEach(function(channel) {
        self.log.debug('State for channel', channel, state[channel]);

        try {
          channelProxies[channel].set(state[channel], function(err) {
            results[channel] = err;
          });
        } catch(e) {
          self.log.error('Error on batch set for channel', channel, e);
          results[channel] = e.message || e;
        }

      });

      this.endBatch(state, function(err) {
        cb(err, results);
      });
    };
    //this.announceChannel('core.batching');
  }

  this.log.debug('Instantiated');

  // TODO: Add proper configuration and start/stop management
  this.start({}, function(){});
};

function addReadOnlyProperty(o, name, value, enumerable) {
  Object.defineProperty(o, name, {writable:false, value:value, enumerable:enumerable, configurable:false});
}

Object.defineProperty(Device.prototype, 'guid', {
  get: function() {
    return Ninja.guid(this.idType, this.id);
  }
});

function checkLogObject(device) {
  try{
    var log = device.log;
  } catch(e) {
    if (device.driver && device.id && device.idType) {
      if (!device.driver.log) {
        throw new Error('The driver you add to a device object must have a log property.');
      }
      addReadOnlyProperty(device, 'log', device.driver.log.extend('[device] ' + device.idType+':'+device.id));
    }
  }
}

function addWriteOnceProperties() {
  var props = Array.prototype.slice.call(arguments);

  props.forEach(function(name) {

    Object.defineProperty(Device.prototype, name, {
      set: function(value) {
        addReadOnlyProperty(this, name, value, true);
        checkLogObject(this);

        if (!this.__initialised) {
          addReadOnlyProperty(this, '__initialised', true);
          process.nextTick(this._init.bind(this));
        }
      }
    });

  });

}

addWriteOnceProperties('driver', 'id', 'idType');

Object.defineProperty(Device.prototype, '_name', {writable:true, enumerable:false, configurable:false});

Object.defineProperty(Device.prototype, 'name', {
  set: function(value) {
    if (this._name !== value) {
      if (this._name) {
        this.log.debug('Setting device name to', value, 'Was:', this._name);
        this.log.warn('TODO: This isn\'t actually sent to HomeCloud yet.');
        //this.send('name', value);
      }
      this._name = value;
    }
  },
  get: function() {
    return this._name;
  }
});

Object.defineProperty(Device.prototype, 'log', {
  get: function() {
    throw new Error('You must set "driver", "id" and "idType" before you can use the log');
  }
});

module.exports = Device;
