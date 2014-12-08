'use strict';

// Should be require('ninja-sphere');
var Ninja = require('../index');

function MyTestService() {
  this.log = Ninja.getLog('MyTestService');

  Ninja.bindService('/service/test-service', this, '$client/MyTestService');
}

// Defined in service/test-service
MyTestService.prototype.sayHello = function(name, age, isBirthday, cb) {
  var message = 'Hello ' + name + '. You are ' + age + ' years old' + (isBirthday? ' and it is your birthday!':'.');
  this._greet(message);
  cb(null, message);
};

// Defined in service/test-service
MyTestService.prototype.sayGoodbye = function(name, cb) {
  var message = 'Goodbye ' + name;
  this._greet(message);
  cb(null, message);
};

MyTestService.prototype._greet = function(greeting) {
  this.log.info(greeting);
  this.emit('greeting', greeting);
};


var service = new MyTestService();


var serviceProxy = Ninja.getServiceProxy('/service/test-service', '$client/MyTestService');

serviceProxy.sayHello('Elliot', 30, function(err, greeting) {
  console.log('Response from sayHello :', err, greeting);
});

serviceProxy.sayHello('John', 30, true, function(err, greeting) {
  console.log('Response from sayHello with optional birthday param :', err, greeting);
});

serviceProxy.sayHello('Frank', 300, function(err, greeting) {
  console.log('Response from sayHello with invalid param :', err, greeting);
});

serviceProxy.on('greeting', function(greeting) {
  console.log('Greeting event:', greeting);
});
