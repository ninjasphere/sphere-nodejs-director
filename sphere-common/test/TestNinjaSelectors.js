var util = require('util');

var NinjaSelectorParser = require('./NinjaSelectorParser');
var N = NinjaSelectorParser.parse.bind(NinjaSelectorParser);

['room[name="Kitchen"] device:hasProtocol(on-off)', 'channel.light', 'channel[name="rumble"].vibrator'].forEach(function(selector) {
  console.log('');
  console.log('Selector', selector.yellow, '>', util.inspect(N(selector), {colors:true, depth:10}));
});
