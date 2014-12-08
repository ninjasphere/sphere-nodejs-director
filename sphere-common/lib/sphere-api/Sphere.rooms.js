'use strict';

var EventEmitter2 = require('eventemitter2').EventEmitter2;
var modelApi = require('./model-api');
var log = Ninja.getLog('Sphere').extend('rooms');
var liftAll = require('when/node').liftAll;

var roomModel = liftAll(Ninja.getService('RoomModel'));
var thingModel = liftAll(Ninja.getService('ThingModel'));

module.exports = function(Sphere) {

  var api = Sphere.rooms = modelApi('room', roomModel, addPromiseExtensions, getRoomProxy, log);

  api.fetchRoomThingIds = function(roomId) {
    return api._extend(roomModel.fetchRoomThingIds(roomId));
  };

  api.byName = function(name) {
    log.trace('Finding', 'room'.green, 'by name', name.yellow);
    return api._extend(api({name: name}).then(function(rooms) {
      if (!rooms.length) {
        throw new Error('No room found with name' + name.yellow);
      }
      if (rooms.length > 1) {
        throw new Error('Multiple rooms found with name ' + name.yellow + '. This shouldn\'t happen!');
      }
      return rooms[0];
    }));
  };

};

function addPromiseExtensions(promise) {

  promise.things = function() {
    return Ninja.Sphere.things._extend(promise.then(function(rooms) {
      if (Array.isArray(rooms)) {

        if (rooms.length === 0) {
          return null;
        }

        if (rooms.length > 1) {
          throw new Error('.things() can only be called on a single room.');
        }

        return rooms[0].things();
      } else {
        return rooms.things();
      }
    }));
  };

}

function getRoomProxy(cfg) {

  var NS = Ninja.Sphere;

  if (!cfg) {
    return cfg;
  }

  var room = new EventEmitter2({wildcard: true});

  Object.keys(cfg).forEach(function(name) {
    room[name] = cfg[name];
  });

  room.things = function() {
    log.trace('Fetching things for room', room.id.yellow);
    return NS.things._wrap(NS.rooms.fetchRoomThingIds(room.id).map(NS.things.byId));
  };

  log.warn('getRoomProxy not done yet!');

  return room;
}
