'use strict';

var _ = require('underscore');
var colors = require('colors');
var crypto = require('crypto');
var EventEmitter = require("events").EventEmitter;

var Log = require('./Log');
var TopicConfig = require('./TopicConfig');

/**
 *
 * MQTT Pub/Sub with replies
 *
 * ** Example **
 *
 *     var bus = new Bus('MyClass', 1883, 'localhost', {keepalive: 10000});
 *
 * @class
 * @param {String|Log} logName The name of the class that owns this bus or an existing log to extend.
 * @param {Number} port The port number of the MQTT server
 * @param {String} host The host of the MQTT server
 * @param {Object} [config] The configuration parameters for MQTT.js
 * @param {Number} config.keepalive The MQTT connection keep-alive value
 */
function Bus(parentLog, mqttConnection, trace) {

  if (typeof parentLog === 'string') {
    this.log = Log.getLogger(parentLog).extend('MQTT Bus', 'yellow');
  } else {
    this.log = parentLog.extend('MQTT Bus', 'yellow');
  }

  this.subscriptions = [];

  if (!trace) {
    this.log.trace = function(){};
  }

  this.mqtt = mqttConnection;
  this.mqtt.on('message', this._onMessage.bind(this));
}

/**
 * Publishes to a topic
 * @method publish
 * @param {TopicConfig|String} topic The MQTT topic (supports wildcards and :params)
 * @param {Mixed...} [args] The arguments. These must be serialisable as JSON.
 * @param {Function} [cb] Callback function
 * @param {String} cb.err The reply error
 * @param {Mixed...} cb.args The reply arguments
 */
Bus.prototype.publish = function() {
  var args = Array.prototype.slice.call(arguments);
  var topic = args.shift();

  var correlationId;
  var callback;

  // If a callback is provided, a reply is expected.
  if (typeof args[args.length-1] === 'function') {
    callback = args.pop();
  }

  this.callMethod(topic, null, args, callback);
};

Bus.prototype.callMethod = function(topic, method, args, callback) {
  var correlationId;
  // If a callback is provided, a reply is expected.
  if (callback) {
    correlationId = idGenerator();
    this._subscribe(topic.withReply?topic.withReply():topic+'/reply', correlationId, callback);
  }

  var payload = {params: args};
  if (method) {
    payload.method = method;
  }

  this._publish(topic, correlationId, payload);
};

Bus.prototype.publishMessage = function(topic, message) {
  var t = topic.getPublishTopic? topic.getPublishTopic() : topic;
  this.log.trace('Out >'.grey, t, 'Message:', message);
  this.mqtt.publish(t, JSON.stringify(message));
};


/**
 * Subscribes to a topic
 * @method subscribe
 * @param {TopicConfig|String} topic The MQTT topic (supports wildcards and :params)
 * @param {Function} cb Callback function
 * @param {Number} cb.topic The incoming topic that the subcription matched on
 * @param {Mixed...} cb.args The arguments
 * @return Subscription
 */
Bus.prototype.subscribe = function(topic, cb) {

  if (typeof topic == 'string' && topic.indexOf(':') > -1) {
    topic = new TopicConfig(topic);
  }

  return this._subscribe(topic, null, cb);
};

function takeOneOut(arr, el) {
  if (arr.indexOf(el) > -1) {
    return arr.splice(arr.indexOf(el), 1);
  }
  return null;
}

/**
 * Cancel a subscription
 * @method subscribe
 * @param {Subscription} subscription The subscription to cancel
 */
Bus.prototype.unsubscribe = function(subscription) {
  var i = this.subscriptions.indexOf(subscription);
  if (~i) {
    this.subscriptions.splice(i, 1);
    subscription.emit('end');
  } else {
    this.log.warn('That subscription is not active.');
  }
};

Bus.prototype.unsubscribeAll = function() {
  this.subscriptions.forEach(function(s) {
    s.emit('end');
  });
  this.subscriptions = [];
};

Bus.prototype._publish = function(topic, correlationId, payload) {

  payload.time = new Date().getTime();
  payload.jsonrpc = '2.0';

  if (correlationId != null) {
    payload.id = correlationId;
  }

  var payloadString;
  try {
    payloadString = JSON.stringify(payload);
  } catch(e) {
    throw new Error('The message payload must be serialisable as JSON. Error: ' + e.message);
  }

  var t = topic.getPublishTopic? topic.getPublishTopic() : topic;

  this.log.trace('Out >'.grey, t,
    payload.id? '(id:' + payload.id + ')':'', JSON.stringify(payload));

  this.mqtt.publish(t, payloadString, topic.config);
};

Bus.prototype._subscribe = function(topic, correlationId, cb) {
  var t = topic.getSubscribeTopic? topic.getSubscribeTopic() : topic;
  this.log.trace('Subscribing to', t);
  var self = this;

  this.mqtt.subscribe(t);

  var subscription = new EventEmitter();

  subscription.correlationId = correlationId;
  subscription.topic = topic;
  if (cb) {
    subscription.rpcCallback = cb;
  }

  // Stops node exiting the process if we aren't listening to the error
  subscription.on('error', function() {});

  if (topic.config && topic.config.timeout) {
    subscription.timeout = setTimeout(function() {
      if (correlationId) {
        // Only if we were waiting for a response is there an issue.
        self.log.warn('Reply timeout for subscription', subscription);
      }
      subscription.emit('timeout');
      subscription.emit('end');
      self.unsubscribe(subscription);
    }, topic.config.timeout);
  }

  this.subscriptions.push(subscription);

  return subscription;
};

Bus.prototype._onMessage = function(topic, message) {
  var self = this;

  this.subscriptions = this.subscriptions.filter(function(s) {
    var match = s.topic.config? s.topic.match(topic) : s.topic == topic;

    if (match) {

      var payload;
      try {
        payload = JSON.parse(message);
      } catch(e) {
        self.log.error('Invalid JSON payload', topic, message, e.message);
        s.emit('error', 'InvalidPayload', e.message);
        return true;
      }

      var rpc = !!payload.jsonrpc;

      // If we are waiting on a reply, but this isn't it... get out.
      if (s.correlationId && payload.id !== s.correlationId) {
        return true;
      }

      self.log.trace('In  <'.green, topic, (s.correlationId?' (cid:' + s.correlationId + ')':''), message);

      if (!s.listeners('message').length && !s.rpcCallback) {
        self.log.warn('Subscription received a message to "%s", but there are no listeners!', topic);
        s.emit('error', 'NoListeners');
        return true;
      }

      var headers = {
        topic: topic,
        subscription: s,
        params: match,
        payload: payload,
        message: message
      };

      // self.log.info('Subscription',s);

      // Emit the plain message
      s.emit('message', headers, payload);

      // If this isn't an rpc but we are waiting for one, error out
      if (!rpc && s.rpcCallback) {
        self.log.warn('Subscription listening for RPCs, but the message received isn\'t one. Got:', message);
        s.emit('error', 'InvalidPayload');
        return true;
      }

      // If we are listening for and have received an rpc, handle the args and potential callback.
      if (rpc && s.rpcCallback) {

        var args;
        if (payload.params) {
          args = [headers].concat(payload.params);
        } else {
          args = [payload.error, payload.result || payload.response];
        }

        var cb;

        if (s.correlationId == null && payload.id != null) {

          // Requires a response
          cb = function(error, response) {
            var responsePayload = {};
            if (error) {
              responsePayload.error = error;
            } else {
              responsePayload.result = response;
            }
            self._publish(new TopicConfig(topic + '/reply'), payload.id, responsePayload);
          };
          args.push(cb);
          headers.cb = cb;
        }

        try {
          s.rpcCallback.apply(s, args);
        } catch(e) {
          self.log.warn('There was an uncaught exception in the handler for ', topic, e.stack);
          if (cb) {
            cb('Uncaught error: ' + e.message || e);
          } else {
            self.log.error('Error in handler for ', topic, e);
            s.emit('error', e.message || e);
          }
        }
      }

      if (s.correlationId) {
        clearTimeout(s.timeout);
        s.emit('end');
        return false;
      }

    }

    return true;
  });

};

function idGenerator() {
  return crypto.randomBytes(4).toString('hex');
}

module.exports = Bus;
