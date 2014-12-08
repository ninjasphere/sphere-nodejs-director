'use strict';

var EventEmitter2 = require('eventemitter2').EventEmitter2;
var modelApi = require('./model-api');
var log = Ninja.getLog('Sphere').extend('things');
var when = require('when');
var liftAll = require('when/node').liftAll;
var WeakMap = require('../WeakMap');

module.exports = function(Sphere) {

  var service = liftAll(Ninja.getService('ThingModel'));

  var api = Sphere.things = modelApi('thing', service, null, getThingProxy, log);

  api.byType = function(type) {
    log.trace('Finding ', 'things'.green, 'by type', type.yellow);
    return api({type: type});
  };

  api.byName = function(name) {
    log.trace('Finding', 'things'.green, 'by name', name.yellow);
    return api({name: name});
  };

  api.byLocation = function(location) {
    if (typeof location === "string") {
      return api({location: location});
    } else if (location && location.id) {
      return api({location: location.id});
    } else {
      throw new Error('Unknown location to search for things', location);
    }
  };

  api.byDevice = function(device) {
    var deviceId = typeof device == 'object'? device.id : device;
    log.trace('Finding things by device id', deviceId.yellow);
    return api({deviceId: deviceId});
  };

};

function getThingProxy(cfg) {

  if (!cfg) {
    return cfg;
  }

  /*var thing = weakThingMap.get(cfg.id);
  if (thing !== null) {
    return thing;
  }*/

  log.debug('Creating new thing proxy for', cfg.id);

  var realThing = new EventEmitter2({wildcard: true});
  var thing = realThing;

  /*thing = weakThingMap.put(cfg.id, realThing/*, function(deletedThing) {
    console.log('Deleted thing!', deletedThing.id);
  });*/

  Object.keys(cfg).forEach(function(name) {
    thing[name] = cfg[name];
  });

  /*thing.on('*', function(state, event, channel, thing) {
    console.log('Event on thing', cfg.name, 'event:', this.event, state, event, channel, thing);
  });*/

  function addMultiMethod(obj, methodName, handler) {
    if (!obj[methodName]) {
      obj[methodName] = function() {
        var args = arguments;
        return when.all(obj[methodName].tasks.map(function(fn) { // XXX: Can this map fn be removed?
          return fn.apply(null, args);
        }));
      };
      obj[methodName].tasks = [];
    }

    obj[methodName].tasks.push(handler);
  }

  thing.channels = cfg.device.channels.map(function(channel) {

    var originalProxy;
    try {
      originalProxy = getChannelProxy(cfg.device.id, channel.id, channel.protocol);
    } catch(e) {
      // No service available
      log.warn('Protocol', channel.protocol, 'not found', e);
      return;
    }

    var proxy = liftAll(originalProxy);

    if (channel.protocol == 'core.batching') {
      thing.set = proxy.setBatch;
    }

    // For each of the methods in the channel, make them accessible from the thing.
    Object.keys(proxy).forEach(function(methodName) {

      /* XXX: This should be handled in the DeviceModel, it should never be possible to save a channel
         that has a method clashing with an existing channel, unless its called 'get' or 'set'
      if (thing[methodName] && thing[methodName].protocol !== channel.protocol) {
        throw new Error('Protocol method clash! The method "' + methodName.yellow + '" is declared in both the ',
          channel.protocol.yellow + ' and ' + thing[methodName].protocol.yellow + ' protocols.');
      }
      */

      if (methodName !== 'set' && methodName !== 'get') {
        addMultiMethod(thing, methodName, proxy[methodName]);
      }

      if (!thing[channel.protocol]) {
        thing[channel.protocol] = {};
      }

      addMultiMethod(thing[channel.protocol], methodName, proxy[methodName]);
    });

    proxy.id = channel.id;
    proxy.name = channel.channel;
    proxy.protocol = channel.protocol;
    originalProxy.on('state', function(state) {
      thing.emit(proxy.protocol, state, proxy, thing);
      thing.emit(proxy.protocol + ':' + channel.channel, state, proxy, thing);
    });

    originalProxy.on('*', function(state) {
      thing.emit(proxy.protocol + ':' + this.event, state, proxy, thing);
    });

    /*if (Ninja.config.mockChannelStates) { // TODO: Move this out... somehow.
      log.info('Mocking channel states on channel proxy', proxy.protocol);
      var locs = [
        '11111111-d357-42da-80f2-8d50d40dc6d5',
        '22222222-d357-42da-80f2-8d50d40dc6d5',
        '33333333-d357-42da-80f2-8d50d40dc6d5'
      ];
      if (proxy.protocol == 'location') {
        setInterval(function() {
          proxy.emit('state', locs[Math.floor(Math.random() * locs.length)]);
        }, 3000);
      }
      if (proxy.protocol == 'on-off') {
        setInterval(function() {
          proxy.emit('state', Math.random() > 0.5);
        }, 3000);
      }
    }*/

    return proxy;
  });

  return realThing;
}

function getChannelProxy(deviceId, channelId, protocol) {
  return Ninja.getServiceProxy(
    '/protocol/' + protocol,
    Ninja.topics.device.channel.service.device(deviceId).channel(channelId).protocol(protocol),
    Ninja.getLog('[Channel Proxy] ' + deviceId + '/' + channelId + '/' + protocol)
  );
}
