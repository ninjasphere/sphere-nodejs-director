'use strict';

var weak = require('weak');

var Log = require('./Log');

function WeakCache(name) {
  this.log = Log.getLogger('WeakCache').extend('name');
  this.cache = {};
}

WeakCache.prototype.put = function(key, val, cleanup) {
  val._cached = true;

  this.log.trace('Adding', key);

  var ref = weak(val, function(obj) {
    this.log.trace('GC\'d', key);
    this.cache[key] = null;
    if (cleanup) {
      cleanup(obj);
    }
  }.bind(this));

  this.cache[key] = ref;

  return ref;
};

WeakCache.prototype.get = function(key) {
  if (this.cache[key] && this.cache[key]._cached) {
    return this.cache[key];
  } else {
    return null;
  }
};

module.exports = WeakCache;
