'use strict';

var _ = require('underscore');
var Houkou = require('houkou');
var util = require('util');

function TopicConfig(topic, params, config) {

  this.params = params || {};
  this.config = config || {};

  this.topic(topic);
}

TopicConfig.prototype.match = function(topic) {
  var match = this.matchRoute.match(topic);

  for (var param in match) {
    if (this.params[param] != '+' && (this.params[param]+'') !== match[param]) {
      return null;
    }
  }
  return match;
};

// Stolen from mqtt-router
function requirements(route) {

  var params = route.match(/\:[a-zA-Z0-9]+/g);

  if (!params) {
    return null;
  }

  var obj = {requirements: {}};

  params.forEach(function(param) {
    obj.requirements[param.replace(':', '')] = "[.a-zA-Z0-9_-]+";
  });

  return obj;
}

TopicConfig.prototype.topic = function(topic) {
  this.baseTopic = topic;

  this.route = new Houkou(topic.replace(/\$/, "\\$"));
  this.matchRoute = new Houkou(topic.replace(/\$/, "\\$"), requirements(topic));

  this.route.parameters.forEach(function(name) {
    if (typeof this.params[name] == 'undefined') {
      this.params[name] = '+';
    }
    this[name] = function(val) {
      if (typeof val === 'undefined' || val === null) {
        throw new Error('Null or undefined value provided for parameter "' + name + '"');
      }
      if (val.indexOf('/') > -1) {
        throw new Error('Value "' + val + '" for parameter "' + name + '" contains a forward-slash.');
      }
      this.params[name] = val;
      return this;
    };
  }.bind(this));
};

TopicConfig.prototype.withReply = function() {
  return new TopicConfig(this.baseTopic + '/reply', this.params, this.config);
};

TopicConfig.prototype.getSubscribeTopic = function() {
  return this.route.build(this.params);
};

TopicConfig.prototype.getPublishTopic = function() {
  for (var param in this.params) {
    if (this.params[param] == '+') {
      throw new Error('You have not set a value for the "' + param + '" parameter. Cannot publish to a wildcard.');
    }
  }
  return this.route.build(this.params);
};


TopicConfig.prototype.setParams = function(vals) {
  _.extend(this.params, vals);
  return this;
};

TopicConfig.prototype.qos = function(qos) {
  this.config.qos = qos;
  return this;
};

TopicConfig.prototype.retain = function(retain) {
  this.config.retain = retain;
  return this;
};

TopicConfig.prototype.timeout = function(timeout) {
  this.config.timeout = timeout;
  return this;
};

TopicConfig.prototype.toString = function() {
  return util.format('[TopicConfig topic=%s params=%s config=%s]',
    this.baseTopic.green, util.inspect(this.params, {colors:true}), util.inspect(this.config, {colors:true}));
};

TopicConfig.apply = function(obj) {
  _.each(obj, function(val, key) {
    if (typeof val === 'string') {
      obj.__defineGetter__(key, function(){
        return new TopicConfig(val);
      });
    } else if (typeof val === 'object') {
      TopicConfig.apply(val);
    }
  });
  return obj;
};

module.exports = TopicConfig;
