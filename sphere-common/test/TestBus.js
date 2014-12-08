'use strict';

var Ninja = require('../index');

var TopicConfig = require('../lib/TopicConfig');

var topic = '$client/device/:device/channel/:channel';

var c = new TopicConfig(topic).device('abc123').timeout(5000);

console.log(c.topic); // $client/device/abc123/channel/+
console.log(c.match('$client/device/xxx/channel/yyy')); // { device: 'xxx', channel: 'yyy' }

console.log(JSON.stringify(c));

var bus = Ninja.getBus('Subscriber');
var bus2 = Ninja.getBus('Publisher');

setTimeout(function() {

  var subscription = bus.subscribe(new TopicConfig(topic), function(headers, name, age, cb) {
    console.log('Received', headers, name, age);

    cb(null, 'Hi ' + name);
  });

  subscription.on('error', function(err) {
    console.log('Sub error!', err);
  });

  subscription.on('rpc', function(headers, name, age, cb) {
    console.log('RPC', headers, name, age);

    //cb(null, 'Hi ' + name);
  });

  subscription.on('message', function(headers, message) {
    console.log('on message', topic, message);
  });

  subscription.on('timeout', function() {
    console.log('timeout');
  });

  subscription.on('end', function() {
    console.log('on end');
  });


  var s2 = bus.subscribe(new TopicConfig(topic).device('myDevice'));

  s2.on('message', function(headers, message) {
    console.log('s2 on message', headers, message);
  });

  setTimeout(function() {
    bus2.publish(new TopicConfig(topic).device('myDevice').channel(1), 'elliot', '30', function(err, greeting) {
      console.log('GOT A REPLY!', greeting);
    });
    bus2.publishMessage(new TopicConfig(topic).device('myDevice').channel(1), 'WHAT UP');
  }, 2000);

}, 3000);
