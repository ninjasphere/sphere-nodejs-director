'use strict';

var util = require('util');
var when = require('when');

module.exports = function(name, service, extensionsCb, proxyFn, log)  {

  var extend = function(promise) {
    addExtensions(promise, extend);
    if (extensionsCb) {
      extensionsCb(promise, extend);
    }
    return promise;
  };

  var api = function(example) {
    if (example) {
      log.trace('Fetching', (name+'s').green, 'by example', util.inspect(example, {colors:true}));
      return extend(service.fetchByExample(example)).map(proxyFn);
    } else  {
      log.trace('Fetching all', (name+'s').green);
      return extend(service.fetchAll()).map(proxyFn);
    }
  };

  api.service = service;

  api.all = function() {
    return api();
  };

  api.byId = function(id) {
    log.trace('Fetching', name.green, 'by id', id.yellow);
    return extend(service.fetch(id)).map(proxyFn);
  };

  api.create = function(entity) {
    log.trace('Creating new ', name.green, 'using', util.inspect(entity, {colors:true}));
    return extend(service.create(entity).map(proxyFn));
  };

  api.delete = function(entity) {
    log.trace('Deleting', name.green, 'with id', (entity.id || entity).yellow);
    return service.delete(entity.id || entity);
  };

  api.each = function(cb) {
    return api().each(cb);
  };

  api.map = function(cb) {
    return api().map(cb);
  };

  api.then = function(cb) {
    return extend(api().then(cb));
  };

  api.on = function(event, handler) {
    return api().on(event, handler);
  };

  api._wrap = function(vals) {
    return extend(when(vals));
  };

  api._extend = extend;

  return api;
};

// Our Sphere-specific extensions to the promises we return
function addExtensions(promise, extend) {

  promise.map = function(cb) {
    return extend(promise.then(function(vals) {
      if (Array.isArray(vals)) {
        return extend(when.all(vals.map(cb)));
      } else {
        return extend(when(cb(vals)));
      }
    }));
  };

  promise.each = function(cb) {
    return extend(promise.then(function(vals) {
      if (Array.isArray(vals)) {
        vals.forEach(cb);
      } else {
        cb(vals);
      }
      return extend(when(vals));
    }));
  };

  promise.on = function(event, handler) {
    return promise.each(function(thing) {
      return thing.on(event, handler);
    });
  };

  return promise;
}
