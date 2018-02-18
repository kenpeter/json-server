// express, override, lodash, id
const express = require('express')
const methodOverride = require('method-override')
const _ = require('lodash')
const lodashId = require('lodash-id')

// db, file sync, body parser, data
const low = require('lowdb')
const fileAsync = require('lowdb/lib/storages/file-async')
const bodyParser = require('../body-parser')
const validateData = require('./validate-data')

// pular
const plural = require('./plural')
// nested
const nested = require('./nested')
// single
const singular = require('./singular')
// mix
const mixins = require('../mixins')


// db file, postid -> posts
module.exports = (source, opts = { foreignKeySuffix: 'Id' }) => {
  // build router
  // Create router
  const router = express.Router()

  // router uses override
  // router uses body submit

  // Add middlewares
  router.use(methodOverride())
  router.use(bodyParser)

  // Create database
  let db
  if (_.isObject(source)) {
    // Db is obj
    db = low()
    db.setState(source)
  } else {
    // db is file
    db = low(source, { storage: fileAsync })
  }

  // Check
  validateData(db.getState())

  // db has mix method
  // Add lodash-id methods to db
  db._.mixin(lodashId)

  // db has mix method
  // Add specific mixins
  db._.mixin(mixins)

  // router has db
  // Expose database
  router.db = db

  // result json p
  // Expose render
  router.render = (req, res) => {
    res.jsonp(res.locals.data)
  }

  // Get db url
  // GET /db
  router.get('/db', (req, res) => {
    res.jsonp(db.getState())
  })

  // parent/parent_id/res
  // Handle /:parent/:parentId/:resource
  router.use(nested(opts))

  // Create route based on db
  // Create routes
  db
    .forEach((value, key) => {
      if (_.isPlainObject(value)) {
        router.use(`/${key}`, singular(db, key))
        return
      }

      if (_.isArray(value)) {
        router.use(`/${key}`, plural(db, key, opts))
        return
      }

      const msg =
        `Type of "${key}" (${typeof value}) ${_.isObject(source)
          ? ''
          : `in ${source}`} is not supported. ` +
        `Use objects or arrays of objects.`

      throw new Error(msg)
    })
    .value()

  // 404
  router.use((req, res) => {
    if (!res.locals.data) {
      res.status(404)
      res.locals.data = {}
    }

    router.render(req, res)
  })

  // 500 error
  router.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).send(err.stack)
  })

  return router
}
