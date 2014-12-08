'use strict';

// Very small test driver and devices

var Ninja = require('../index');
var util = require('util');

function MyDriver(name) {
  this.name = name;
}
Ninja.driver(MyDriver);

MyDriver.prototype.start = function(config, cb) {
  new MyDevice(this, '192.168.1.1');
  cb();
};







function MyDevice(driver, ip) {
  this.driver = driver;
  this.id = ip;
  this.idType = 'ipv4';
  this.writable = true;
  this.pollable = true;
}
Ninja.device(MyDevice);

MyDevice.prototype.start = function(config) {
  this.log.info('Woo I\'m starting!');

  this.announceChannel(1, 'media-player', function(value, channel, protocols, cb) {
    this.log.info('Callback write', value, 'to channel', channel, 'using protocol', protocols);
    cb(null);
  }.bind(this));

  this.announceChannel(2, 'ping');

  var i = 0;
  setInterval(function() {
    this.emit(1, 'hello ' + (i++));
  }.bind(this), 3000);

};

MyDevice.prototype.write = function(value, channel, protocols, cb) {
  this.log.info('Generic Write', value, 'to channel', channel, 'using protocol', protocols);
  cb(null);
};

















var first = new MyDriver('com.ninjablocks.firstDriver');
var second = new MyDriver('com.ninjablocks.secondDriver');

first.log.debug('This should be first');
second.log.debug('This should be second');


var bus = Ninja.getBus('Test Bus');
setInterval(function() {
  bus.publish(Ninja.topics.device.channel.state.device('ipv4.192.168.1.1').channel('2'), {what:'up'}, 2, ['media-player'], function(err) {
    if (err) {
      console.warn('Failed to actuate device channel');

    } else {
      console.log('Actuated!');
    }
  });
}, 6500);
