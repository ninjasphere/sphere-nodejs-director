'use strict';

var log = Ninja.getLog('Sphere');

var Sphere = {};

require('./Sphere.things')(Sphere);
require('./Sphere.rooms')(Sphere);

module.exports = Sphere;


/*
// State managed outside drivers
Ninja.Sphere.things.byType('person').on('location', function(location, person) {

  location.things.byType('light').each(function(light) {
    light.turnOn();

    setTimeout(function() {
      if (person.location != location) { // XXX: Might turn off even if someone else is in there
        light.turnOff();
      }
    }, 120000);
  });

});

// State managed in drivers, but controlled from outside
Ninja.Sphere.things.byType('person').on('location', function(location, person) {

  location.things.byType('light').each(function(light) {
    var state = light.turnOn();

    setTimeout(function() {

      light.isStateActive(state, function(active) {
        if (active && person.location != location) {
          light.turnOff();
        }
      });

    }, 120000);
  });

});

// State managed in drivers
Ninja.Sphere.things.byType('person').on('location', function(location, person) {

  location.things.byType('light').each(function(light) {
    light.alert(120000);
  });

});
//*/
