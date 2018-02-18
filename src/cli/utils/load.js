// path, url, db, file async
const path = require('path')
const request = require('request')
const low = require('lowdb')
const fileAsync = require('lowdb/lib/storages/file-async')

//
const is = require('./is')

module.exports = function(source, cb) {
  // See db in url, remote data
  if (is.URL(source)) {
    // Load remote data
    const opts = {
      url: source,
      json: true
    }

    // Request with url
    request(opts, (err, response) => {
      // call back with error
      if (err) return cb(err)

      // or callback with body
      cb(null, response.body)
    })

  } else if (is.JS(source)) {
    // Clear cache
    // Read file into mem
    const filename = path.resolve(source)
    // clean cache
    delete require.cache[filename]
    // Read file
    const dataFn = require(filename)

    // file has no func, throw
    if (typeof dataFn !== 'function') {
      throw new Error(
        'The database is a JavaScript file but the export is not a function.'
      )
    }

    // Call and get data
    // Run dataFn to generate data
    const data = dataFn()
    // callback with data
    cb(null, data)
  } else if (is.JSON(source)) {
    // Load JSON using lowdb

    // low
    // json file
    // file async
    // get state
    const data = low(source, { storage: fileAsync }).getState()

    // callback.
    cb(null, data)
  } else {
    throw new Error(`Unsupported source ${source}`)
  }
}
