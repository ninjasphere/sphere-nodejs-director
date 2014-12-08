'use strict';

var _ = require('underscore');
var uuid = require('node-uuid');

/**
 * Ninja Sphere - Mock Thing Model Service.
 *
 * @class ThingModel
 * @implements http://schema.ninjablocks.com/service/thing-model
 *
 */

function ThingModel() {
  Ninja.bindService('/service/thing-model', this, '$home/services/ThingModel');
}

/**
 * Saves a new Thing
 * @method create
 *
 *
 * @param {object} thing
 * @param {Function} cb The callback function
 * @param {NinjaError} cb.err The error object
 * @param {Thing} cb.result
 */
ThingModel.prototype.create = function(thing, cb) {
  thing.id = uuid.v4();
  things.push(thing);
  cb(null, thing);
};

/**
 * Retrieves all Things
 * @method fetchAll
 *
 *
 * @param {Function} cb The callback function
 * @param {NinjaError} cb.err The error object
 * @param {array} cb.result
 */
ThingModel.prototype.fetchAll = function(cb) {
  cb(null, things);
};

/**
 * Retrieves a Thing by device id
 * @method fetchByDeviceId
 *
 *
 * @param {string} deviceId
 * @param {Function} cb The callback function
 * @param {NinjaError} cb.err The error object
 * @param {undefined} cb.result
 */
ThingModel.prototype.fetchByDeviceId = function(deviceId, cb) {
  cb(null, _.filter(things, function(thing) {
    return thing.device.id == deviceId;
  }));
};


ThingModel.prototype.fetch = function(id, cb) {
  cb(null, _.findWhere(things, {
    id: id
  }));
};

/**
 * Updates the location of a Thing
 * @method updateLocation
 *
 *
 * @param {string} thingId
 * @param {string} location
 * @param {Function} cb The callback function
 * @param {NinjaError} cb.err The error object
 * @param {undefined} cb.result
 */
ThingModel.prototype.updateLocation = function(thingId, location, cb) {
  _.findWhere(things, {
    id: thingId
  }).location = location;
  cb(null);
};

/**
 * Deletes a Thing
 * @method delete
 *
 *
 * @param {string} thingId
 * @param {Function} cb The callback function
 * @param {NinjaError} cb.err The error object
 * @param {undefined} cb.result
 */
ThingModel.prototype.delete = function(thingId, cb) {
  var t = _.findWhere(things, {
    id: thingId
  });
  things = _.without(things, t);
  cb(null);
};

/**
 * Fetch a list of things by type
 * @method fetchByType
 *
 *
 * @param {string} type
 * @param {Function} cb The callback function
 * @param {NinjaError} cb.err The error object
 * @param {array} cb.result
 */
ThingModel.prototype.fetchByType = function(type, cb) {
  cb(null, _.where(things, {
    type: type
  }));
};

ThingModel.prototype.fetchByExample = function(example, cb) {
  cb(null, _.where(things, example));
};

module.exports = ThingModel;

var things = module.exports.things = [{
  "type": "unknown",
  "device": {
    "guid": "0e17f034e3",
    "name": "Socket One (Light) with Power and Energy",
    "id": "0e17f034e3",
    "signatures": {
      "ninja:manufacturer": "NinjaBlocks",
      "ninja:productName": "Fake Socket with Power and Energy",
      "ninja:productType": "Power Socket"
    },
    "thing": "8dd6f9b0-d357-42da-80f2-8d50d40dc6d5",
    "idType": "fakesocket",
    "channels": [{
      "id": "4cf93b1b26",
      "channel": "power",
      "supported": {
        "events": ["state"]
      },
      "protocol": "power"
    }, {
      "id": "3a4d03b4cc",
      "channel": "energy",
      "supported": {
        "events": ["state"]
      },
      "protocol": "energy"
    }, {
      "id": "4e235faa38",
      "channel": "on-off",
      "supported": {
        "methods": ["setOnOff", "toggleOnOff"],
        "events": ["state"]
      },
      "protocol": "on-off"
    }]
  },
  "name": "New Thing",
  "id": "8dd6f9b0-d357-42da-80f2-8d50d40dc6d5"
}, {
  "type": "light",
  "device": {
    "guid": "172924ca58",
    "name": "Fake Light Two",
    "id": "172924ca58",
    "signatures": {
      "ninja:manufacturer": "NinjaBlocks",
      "ninja:productName": "Fake Light",
      "ninja:productType": "Light",
      "ninja:thingType": "light"
    },
    "thing": "97b63911-01e3-402f-ada5-b57af89b00d9",
    "idType": "fakelight",
    "channels": [{
      "id": "4e235faa38",
      "channel": "on-off",
      "supported": {
        "methods": ["setOnOff", "toggleOnOff"],
        "events": ["state"]
      },
      "protocol": "on-off"
    }, {
      "id": "d89885cc09",
      "channel": "light",
      "supported": {
        "methods": ["setLight", "alertLight"],
        "events": ["state"]
      },
      "protocol": "light"
    }]
  },
  "name": "New Thing",
  "id": "97b63911-01e3-402f-ada5-b57af89b00d9"
}, {
  "type": "switch",
  "device": {
    "guid": "349c8e0ae1",
    "name": "Light Switch Panel with 3 switches",
    "id": "349c8e0ae1",
    "signatures": {
      "ninja:manufacturer": "NinjaBlocks",
      "ninja:productName": "Fake Light Switch Panel with 3 switches",
      "ninja:productType": "Light Switch",
      "ninja:thingType": "switch"
    },
    "thing": "71f37e0c-8cdf-4d29-bcb4-746053e90ee4",
    "idType": "fakeswitches",
    "channels": [{
      "id": "cbef7e069a",
      "channel": "switch3",
      "supported": {
        "methods": ["setOnOff", "toggleOnOff"],
        "events": ["state"]
      },
      "protocol": "on-off"
    }, {
      "id": "f1cc1d3dc3",
      "channel": "switch2",
      "supported": {
        "methods": ["setOnOff", "toggleOnOff"],
        "events": ["state"]
      },
      "protocol": "on-off"
    }, {
      "id": "afc5310c5d",
      "channel": "switch1",
      "supported": {
        "methods": ["setOnOff", "toggleOnOff"],
        "events": ["state"]
      },
      "protocol": "on-off"
    }]
  },
  "name": "New Thing",
  "id": "71f37e0c-8cdf-4d29-bcb4-746053e90ee4"
}, {
  "type": "unknown",
  "device": {
    "guid": "f47788b8cc",
    "name": "Socket Three (Heavy) with Energy",
    "id": "f47788b8cc",
    "signatures": {
      "ninja:manufacturer": "NinjaBlocks",
      "ninja:productName": "Fake Socket with Energy",
      "ninja:productType": "Power Socket"
    },
    "thing": "4aa005db-3618-404d-82df-d05d342045fb",
    "idType": "fakesocket",
    "channels": [{
      "id": "3a4d03b4cc",
      "channel": "energy",
      "supported": {
        "events": ["state"]
      },
      "protocol": "energy"
    }, {
      "id": "4e235faa38",
      "channel": "on-off",
      "supported": {
        "methods": ["setOnOff", "toggleOnOff"],
        "events": ["state"]
      },
      "protocol": "on-off"
    }]
  },
  "name": "New Thing",
  "id": "4aa005db-3618-404d-82df-d05d342045fb"
}, {
  "type": "light",
  "device": {
    "guid": "43a55b0650",
    "name": "Fake Light One",
    "id": "43a55b0650",
    "signatures": {
      "ninja:manufacturer": "NinjaBlocks",
      "ninja:productName": "Fake Light",
      "ninja:productType": "Light",
      "ninja:thingType": "light"
    },
    "thing": "60b2551f-6e98-4dab-8dfe-a74837c42a2a",
    "idType": "fakelight",
    "channels": [{
      "id": "4e235faa38",
      "channel": "on-off",
      "supported": {
        "methods": ["setOnOff", "toggleOnOff"],
        "events": ["state"]
      },
      "protocol": "on-off"
    }, {
      "id": "d89885cc09",
      "channel": "light",
      "supported": {
        "methods": ["setLight", "alertLight"],
        "events": ["state"]
      },
      "protocol": "light"
    }]
  },
  "name": "New Thing",
  "id": "60b2551f-6e98-4dab-8dfe-a74837c42a2a"
}, {
  "type": "person",
  "device": {
    "idType": "location",
    "id": "20CD39A07EDF",
    "thing": "43ed1164-89f5-43d4-8591-672d2afc5c2c",
    "channels": [{
      "id": "location",
      "channel": "location",
      "supported": {
        "events": ["state"]
      },
      "protocol": "location"
    }]
  },
  "name": "Ninja Sphere Tag",
  "id": "43ed1164-89f5-43d4-8591-672d2afc5c2c",
  "location": "875c367e-a6c7-4298-b16d-64be78edb0d9"
}, {
  "type": "unknown",
  "device": {
    "guid": "13294d4619",
    "name": "Socket Two (Medium) with Power",
    "id": "13294d4619",
    "signatures": {
      "ninja:manufacturer": "NinjaBlocks",
      "ninja:productName": "Fake Socket with Power",
      "ninja:productType": "Power Socket"
    },
    "thing": "06c5e253-53f5-45d5-a0e6-8596b51836c3",
    "idType": "fakesocket",
    "channels": [{
      "id": "4cf93b1b26",
      "channel": "power",
      "supported": {
        "events": ["state"]
      },
      "protocol": "power"
    }, {
      "id": "4e235faa38",
      "channel": "on-off",
      "supported": {
        "methods": ["setOnOff", "toggleOnOff"],
        "events": ["state"]
      },
      "protocol": "on-off"
    }]
  },
  "name": "New Thing",
  "id": "06c5e253-53f5-45d5-a0e6-8596b51836c3"
}];
