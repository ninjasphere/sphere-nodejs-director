'use strict';

require('../index');
new (require('./mock/MockThingModel'))();
new (require('./mock/MockRoomModel'))();

/*
// Standard promise
Ninja.Sphere.things.all().then(function(things) {
  console.log('Got things!', things);
}).catch(function(e) {
  console.log('Something went wrong', e);
});

// Iterate using each
Ninja.Sphere.things.all().each(function(thing) {
  console.log('Got a thing!', thing);
});

// Map
Ninja.Sphere.things.all()
  .map(function(thing) {
    return thing.name;
  })
  .each(function(name) {
    console.log('Got a thing name!', name);
  })
  .catch(function(e) {
    console.log('Something went wrong', e);
  });

// by just doing things. yolo
Ninja.Sphere.things.each(function(thing) {
  console.log('Found all thing 2', thing);
});

// by id
Ninja.Sphere.things.byId('71f37e0c-8cdf-4d29-bcb4-746053e90ee4').then(function(thing) {
  console.log('Found by id', thing.name);
});

/*
// by device id
Ninja.Sphere.things.byDevice('172924ca58').then(function(thing) {
  console.log('Found by device', thing);
});

// by type
Ninja.Sphere.things.byType('person').each(function(person) {
  console.log('Got a person', person);
});

// by name
Ninja.Sphere.things.byName('elliot').each(function(elliot) {
  console.log('Got elliot by name', elliot);
});

// by example
Ninja.Sphere.things({name: 'elliot'}).each(function(person) {
  console.log('Found elliot', person);
});

// by empty example (returns everything)
Ninja.Sphere.things().each(function(thing) {
  console.log('Found all thing', thing);
});
*/
/*

// channel state listen
Ninja.Sphere.things.byType('switch').on('on-off', function(state, channel, thing) {
  console.log('Multiple listen state!', state, channel.name, thing.name);
});

// channel state event listener
Ninja.Sphere.things.byId('71f37e0c-8cdf-4d29-bcb4-746053e90ee4').on('on-off', function(state, channel) {
  console.log('Individual listen state!', state, channel.name);
});*/


/*Ninja.Sphere.rooms().then(function(rooms) {
  console.log('got the rooms', rooms.length);
});

Ninja.Sphere.rooms.byName('kitchen').things().on('location', function(locationId, channel, thing) {
  Ninja.Sphere.rooms.byId(locationId).then(function(location) {
    console.log('Thing', thing.id.yellow, 'was originally in the kitchen but is now at', location.name.yellow);
  });
}).each(function(thing) {
  console.log('Thing', thing.id.yellow, ' is in the kitchen.');
});*/

Ninja.Sphere.things().each(function(thing) {
  if (thing.turnOff && thing.turnOn) {
    thing.turnOff().delay(2000).then(thing.turnOn);
  }
});


Ninja.Sphere.rooms.byId('11111111-d357-42da-80f2-8d50d40dc6d5').things().each(function(thing) {
  thing.turnOff().delay.turnOn().catch(function(err) {
    console.error('Failed to turn', thing.name.yellow, 'off and on');
  });
});
