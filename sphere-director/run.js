#!/usr/bin/env node

process.title = __dirname.substring(__dirname.lastIndexOf('/')+1);
console.log('### Starting', process.title);

var p = require('path').resolve(__dirname, '../sphere-common');
if (require('fs').existsSync(p)) {
  require(p);
} else {
  require('ninja-sphere');
}

module.exports = new (require('./index'))();
