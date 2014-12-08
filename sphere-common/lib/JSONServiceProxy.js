'use strict';

var EventEmitter2 = require('eventemitter2').EventEmitter2;

var TopicConfig = require('./TopicConfig');

function JSONServiceProxy(serviceUri, topic) {

  var Ninja = require('../index'); // XXX: FIXME: To solve circ-dep

  var log = Ninja.getLog('[Service Proxy] ' + serviceUri);

  var bus = Ninja.getBus(log);

  var proxy = new EventEmitter2({wildcard: true});

  if (typeof topic != 'string') {
    topic = topic.getSubscribeTopic();
  }

  log.trace('Creating proxy object for service', serviceUri, 'at topic', topic);

  var service = Ninja.SchemaTools.getSchema(serviceUri);

  if (!service) {
    throw new Error('Could not find service', serviceUri);
  }

  if (service.methods) {

    Object.keys(service.methods).forEach(function(methodName) {

      var paramsSchema = {
        type: 'array'
      };
      var resolvedParams = [];

      if (service.methods[methodName].params) {
        resolvedParams = service.methods[methodName].params.map(function(param) {
          return Ninja.SchemaTools.getSchema(param.value);
        });

        paramsSchema.items = service.methods[methodName].params.map(function(param) {
          return param.value;
        });
      }

      this[methodName] = function() {

        var args = Array.prototype.slice.call(arguments);

        var callback;
        if (typeof args[args.length - 1] === 'function') {
          callback = args.pop();
        }

        if (args.length > resolvedParams.length) {
          log.warn('Too many arguments for method "' + methodName + '" args:', args);
          throw new Error('Too many arguments for method "' + methodName + '"');
        }

        var params = resolvedParams.map(function(param, i) {
          if (typeof args[i] === 'undefined') {
            return param.default;
          } else {
            return args[i];
          }
        });

        var message = Ninja.SchemaTools.validate(paramsSchema, params);
        if (message) {
          var err = 'Invalid arguments for method "' + methodName + '" ' + message;
          if (callback) {
            callback(err);
          } else {
            throw new Error(err);
          }
        } else {
          bus.callMethod(topic, methodName, params, callback || function(){});
        }

      };
    }.bind(proxy));
  }

  // Handle service events
  bus.subscribe(topic + '/event/:event', function(headers, data) {
    log.trace('Got event', headers.params.event.yellow, 'with payload', JSON.stringify(data).yellow);
    this.emit(headers.params.event, data);
  }.bind(proxy));

  return proxy;
}

module.exports = JSONServiceProxy;
