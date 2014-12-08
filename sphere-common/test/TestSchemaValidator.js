'use strict';

var SchemaValidator = require('../lib/SchemaValidator');

var lightValidator = SchemaValidator.getServiceValidators('/protocol/light');

var valid = {power:true};
var invalid = {power:1};

lightValidator.events.state(valid);

try {
  lightValidator.events.state(invalid);
  console.warn('Something went wrong');
} catch(e) {
  // Expected
}

lightValidator.methods.setLight.params([valid]);

try {
  lightValidator.methods.setLight.params([invalid]);
  console.warn('Something went wrong');
} catch(e) {
  // Expected
}

try {
  lightValidator.methods.setLight.params([valid, "hello"]);
  console.warn('Something went wrong');
} catch(e) {
  // Expected
}


var messageValidator = SchemaValidator.getServiceValidators('protocol/message-display');

// displayMessage has a default value for the second param... it should return it.
var params = messageValidator.methods.displayMessage.params([{message:'Hi There'}]);
if (params.length !== 2) {
  throw new Error('Default params not set by the validator! Got:' + JSON.stringify(params));
}

try {
  messageValidator.methods.displayMessage.params([{message:'Hi There'}, -10]);
  console.warn('Something went wrong with displayMessage test');
} catch(e) {
  // Expected
}
