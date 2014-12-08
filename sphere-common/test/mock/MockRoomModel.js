'use strict';

var things = require('./MockThingModel').things;

var _ = require('underscore');
var uuid = require('node-uuid');

/**
 * Ninja Sphere - Room Model Service.
 *
 * @class RoomModel
 * @implements http://schema.ninjablocks.com/service/room-model
 *
 */

function RoomModel() {
  Ninja.bindService('http://schema.ninjablocks.com/service/room-model', this, '$home/services/RoomModel');
}

/**
 * Saves a new Room
 * @method create
 *
 *
 * @param {object} room
 * @param {Function} cb The callback function
 * @param {NinjaError} cb.err The error object
 * @param {Room} cb.result
 */
RoomModel.prototype.create = function(room, cb) {
  room.id = uuid.v4();
  rooms.push(room);
  cb(null, room);
};

/**
 * Retrieves a Room
 * @method fetch
 *
 * @param {string} roomId
 * @param {Function} cb The callback function
 * @param {NinjaError} cb.err The error object
 * @param {Room} cb.result
 */
RoomModel.prototype.fetch = function(roomId, cb) {
  cb(null, _.findWhere(rooms, {
    id: roomId
  }));
};

/**
 * Retrieves all Rooms
 * @method fetchAll
 *
 *
 * @param {Function} cb The callback function
 * @param {NinjaError} cb.err The error object
 * @param {Room[]} cb.result
 */
RoomModel.prototype.fetchAll = function(cb) {
  cb(null, rooms);
};

/**
 * Retrieves all Things of a certain thing type from a room
 * @method thingsByType
 *
 *
 * @param {string} roomId
 * @param {string} thingType
 * @param {Function} cb The callback function
 * @param {NinjaError} cb.err The error object
 * @param {array} cb.result
 */
RoomModel.prototype.thingsByType = function(roomId, thingType, cb) {
  this.fetch(roomId, function(err, room) {
    cb(null, _.findWhere(room.things, {
      type: thingType
    }));
  });
};

/**
 * Retrieves all Things that match the example object
 * @method fetchByExample
 *
 *
 * @param {object} example
 * @param {Function} cb The callback function
 * @param {NinjaError} cb.err The error object
 * @param {array} cb.result
 */
RoomModel.prototype.fetchByExample = function(example, cb) {
  cb(null, _.where(rooms, example));
};

/**
 * Retrieves the ids of all Things in a Room
 * @method fetchRoomThingIds
 *
 *
 * @param {string} roomId
 * @param {Function} cb The callback function
 * @param {NinjaError} cb.err The error object
 * @param {array} cb.result
 */
RoomModel.prototype.fetchRoomThingIds = function(roomId, cb) {
  this.fetch(roomId, function(err, room) {
    cb(null, room.things.map(function(thing) {
      return thing.id;
    }));
  });
};

/**
 * Deletes a Room
 * @method delete
 *
 *
 * @param {string} roomId
 * @param {Function} cb The callback function
 * @param {NinjaError} cb.err The error object
 * @param {undefined} cb.result
 */
RoomModel.prototype.delete = function(roomId, cb) {
  var r = _.findWhere(rooms, {
    id: roomId
  });
  rooms = _.without(rooms, r);
  cb(null);
};

/**
 * Moves a Thing from one Room to another Room
 * @method moveThing
 *
 *
 * @param {string} fromRoomId Current room id
 * @param {string} toRoomId Target room id
 * @param {string} thingId
 * @param {Function} cb The callback function
 * @param {NinjaError} cb.err The error object
 * @param {null} cb.result TODO: Success value?
 */
RoomModel.prototype.moveThing = function(fromRoomId, toRoomId, thingId, cb) {
  this.fetch(fromRoomId, function(err, room) {
    room.things = _.filter(room.things, function(thing) {
      return thing.id != thingId;
    });
    this.fetch(toRoomId, function(err, room) {
      room.things.push(_.findWhere(things, {
        id: thingId
      }));
      cb(null);
    });
  });
};

/**
 * Removes a Thing from a Room
 * @method removeThing
 *
 *
 * @param {string} roomId
 * @param {string} thingId
 * @param {Function} cb The callback function
 * @param {NinjaError} cb.err The error object
 * @param {null} cb.result TODO: Success value?
 */
RoomModel.prototype.removeThing = function(roomId, thingId, cb) {
  this.fetch(roomId, function(err, room) {
    room.things = _.filter(room.things, function(thing) {
      return thing.id != thingId;
    });
  });
};

var rooms = [
  {
    id: '11111111-d357-42da-80f2-8d50d40dc6d5',
    name: 'kitchen',
    things: [
      '8dd6f9b0-d357-42da-80f2-8d50d40dc6d5',
      '97b63911-01e3-402f-ada5-b57af89b00d9',
      '43ed1164-89f5-43d4-8591-672d2afc5c2c'
    ]
  },
  {
    id: '22222222-d357-42da-80f2-8d50d40dc6d5',
    name: 'lounge'
  },
  {
    id: '33333333-d357-42da-80f2-8d50d40dc6d5',
    name: 'bathroom',
    things: [
      '4aa005db-3618-404d-82df-d05d342045fb',
      '60b2551f-6e98-4dab-8dfe-a74837c42a2a',
      '06c5e253-53f5-45d5-a0e6-8596b51836c3'
    ]
  }
];

module.exports = RoomModel;

rooms.forEach(function(room) {
  room.things = (room.things || []).map(function(thingId) {
    return _.findWhere(things, {
      id: thingId
    });
  });
});
