'use strict';

var EventEmitter = require('events').EventEmitter;

var TopicConfig = require('./TopicConfig');
var pkgInfo = require('pkginfo');
var path = require('path');

var bus;

// XXX: This needs to be cleaned up... but it works enough for now

function bind(serviceUri, target, mapping, topic, parentLog, announcement) {

  if (typeof topic == 'string') {
    topic = new TopicConfig(topic);
  }

  if (!bus) {
    bus = Ninja.getBus('JsonServiceBinder');
  }

  var log = (parentLog || target.log || Ninja.getLog('')).extend('[Service] ' + serviceUri);

  var service = Ninja.SchemaTools.getSchema(serviceUri);
  var validators = Ninja.SchemaTools.getServiceValidators(serviceUri);

  log.debug('Binding service', serviceUri, 'to', target.name || target.id || 'target', topic);

  var proxy = {};

  var result = {};
  Object.defineProperty(result, 'proxy', {enumerable: false, value: proxy});

  // Step 1 - RPC


  if (service.methods && Object.keys(service.methods).length) {
    if (!target._rpc) {
      Object.defineProperty(target, '_rpc', {writable:false, value:{}, enumerable:false, configurable:false});
    }

    //TODO: Name this better... methodName = method's name is schema, method = method's name on local service.
    var supportedMethods = Object.keys(service.methods).filter(function(methodName) {
      var method = methodName;
      if (mapping && mapping[method]) {
        method = mapping[method];
      }
      if (!target[method]) {
        var required = service.methods[methodName].required;
        // By default, all methods are required
        if (typeof required === 'undefined' || required === true) {
          throw new Error('Method ' + methodName.yellow + ' is required for service ' + serviceUri.yellow);
        }
        return false;
      }
      if (target._rpc[method] && target._rpc[method] !== serviceUri) {
        throw new Error(
          'RPC service method clash!'.red + ' Method ' + method.yellow + ' is in both ' +
          target._rpc[method].yellow + ' and ' + serviceUri.yellow
        );
      }
      target._rpc[method] = serviceUri;

      // The proxy object provides the methods at their names as described in the schema,
      // and provides params validation and defaults.
      proxy[methodName] = function() {

        var args = Array.prototype.slice.call(arguments);

        var headers;
        // Headers are optional
        if (typeof args[args.length-1] == 'object') {
          headers = args.pop();
        }

        var callback;
        // Callback is also.
        if (typeof args[args.length-1] == 'function') {
          callback = args.pop();
        }

        // Validate the parameters, and get any default values if they aren't provided.
        var params = validators.methods[methodName].params(args) || [];

        // EERGGH
        if (typeof params == 'string') {
          params = []
        }

        if (callback) {
          // Validate the return value
          params.push(function(err, result) {
            try {
              validators.methods[methodName].returns(result);
              callback(null, result);
            } catch(e) {
              log.error('Failed validating return of', methodName, 'with', result, e);
              callback(e);
            }
          });
        }

        if (headers) {
          params.push(headers);
        }

        try {
          target[method].apply(target, params);
        } catch(e) {
          log.error('Exception calling service method', methodName, e, e.stack);
          if (callback) {
            callback('Exception: ' + (e.message || e));
          }
        }
      };
      return true;
    });

    log.debug('Supported methods:', supportedMethods);

    if (supportedMethods.length) {
      var subscription = bus.subscribe(topic, function(headers, request) {
        if (supportedMethods.indexOf(headers.payload.method) < 0) {
          return headers.cb('Endpoint does not support the method "' + headers.payload.method + '"');
        }
        var args = [].concat(headers.payload.params);
        args.push(headers.cb);
        args.push(headers);

        proxy[headers.payload.method].apply(target, args);
      });

      result.methods = supportedMethods;
    }
  }

  // Step 2 - Events
  if (service.events && Object.keys(service.events).length) {

    if (!target.on || !target.emit) {
      // XXX: This is *dirty*.... FIXME!
      var emitter = new EventEmitter();
      target.emit = emitter.emit.bind(emitter);
      target.on = emitter.on.bind(emitter);
    }

    Object.keys(service.events).forEach(function(event) {
      target.on(event, function(data) {

        validators.events[event](data);

        bus.publish(
          topic.getPublishTopic() + '/event/' + event,
          data
        );
      });
    });

    result.events = Object.keys(service.events);
  }



  announcement = announcement || {};

  announcement.topic = topic.getPublishTopic();
  announcement.schema = service.id;
  announcement.supportedMethods = result.methods || [];
  announcement.supportedEvents = []; // Don't actually know which ones it supports atm

  bus.publish(
    topic.getPublishTopic() + '/event/announce',
    announcement
  );

  return result;
}

module.exports = {bind:bind};
