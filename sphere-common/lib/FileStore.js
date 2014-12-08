'use strict';

var nStore = require('nstore');
nStore = nStore.extend(require('nstore/query')());

// TODO: Versioning and syncing (over mqtt?)

/**
 * @class
 * Simple key/val storage with querying, backed by a write-only JSON file.
 */
function FileStore(file, done) {

  /**
   * Retrieves a value, using and storing the defaultValue if no value was available.
   *
   * @param {String} key The object key
   * @param {Mixed} defaultValue What to store and return if no value is available
   * @param {Function} cb The callback
   * @param {String} cb.err The error name
   * @param {Mixed} cb.value The returned value
   */
  this.get = function(key, defaultValue, cb) {
    if (!cb) {
      cb = defaultValue;
      defaultValue = null;
    }
    store.get(key, function(err, value) {
      if (value || (!value && !defaultValue)) {
        cb(err, value);
      } else {
        store.save(key, defaultValue, function(err) {
          cb(err, defaultValue);
        });
      }
    });
  };

  var store = nStore.new(file, done);

  /**
   * Inserts a value into the store
   *
   * @param {String} key The object key
   * @param {Mixed} value What to store
   * @param {Function} cb The callback
   * @param {String} cb.err The error name
   */
  this.put = store.save.bind(store);

  /**
   * Inserts a value into the store
   *
   * @param {Object} query The query object.
   * See: [Structure of condition expressions] (https://github.com/creationix/nstore#structure-of-condition-expressions)
   * @param {Function} cb The callback
   * @param {String} cb.err The error name
   * @param {Mixed[]} cb.results The values in this store that match the query
   */
  this.query = store.find.bind(store);

}

module.exports = FileStore;
