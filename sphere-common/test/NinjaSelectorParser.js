var Ninja = require('../index');

var CssSelectorParser = require('css-selector-parser').CssSelectorParser;

function NinjaSelectorParser() {

  this.log = Ninja.getLog('NinjaSelectorParser');
  this.parser = new CssSelectorParser();

  this.parser.registerSelectorPseudos('hasProtocol');
  //parser.registerNestingOperators('>', '+', '~');
  //parser.registerAttrEqualityMods('^', '$', '*', '~');
  //parser.enableSubstitutes();
}

NinjaSelectorParser.prototype.parse = function(selector) {
  return this.parser.parse(selector);
};

module.exports = new NinjaSelectorParser();
