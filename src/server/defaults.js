const fs = require('fs')
const path = require('path')
const express = require('express')
const logger = require('morgan')

const cors = require('cors')
const compression = require('compression')
const errorhandler = require('errorhandler')
const objectAssign = require('object-assign')

const bodyParser = require('./body-parser')

module.exports = function(opts) {
  // curr process dir public path
  const userDir = path.join(process.cwd(), 'public')
  // or curr file dir public path
  const defaultDir = path.join(__dirname, 'public')

  // all called static dir
  const staticDir = fs.existsSync(userDir) ? userDir : defaultDir

  // copy whatever dir to options
  opts = objectAssign({ logger: true, static: staticDir }, opts)

  // global util array
  const arr = []

  // Global array has compress
  if (!opts.noGzip) {
    arr.push(compression())
  }

  // Global array has cross domain
  // Enable CORS for all the requests, including static files
  if (!opts.noCors) {
    arr.push(cors({ origin: true, credentials: true }))
  }

  // Global array has error handler
  if (process.env.NODE_ENV === 'development') {
    // only use in development
    arr.push(errorhandler())
  }

  // Global array has static dir
  // Serve static files
  arr.push(express.static(opts.static))

  // Global array has logger
  // Logger
  if (opts.logger) {
    arr.push(
      logger('dev', {
        skip: req =>
          process.env.NODE_ENV === 'test' || req.path === '/favicon.ico'
      })
    )
  }

  // Global array has function, no cache for IE
  // No cache for IE
  // https://support.microsoft.com/en-us/kb/234067
  arr.push((req, res, next) => {
    res.header('Cache-Control', 'no-cache')
    res.header('Pragma', 'no-cache')
    res.header('Expires', '-1')
    next()
  })

  // Global array has func, get next or 403
  // Read-only
  if (opts.readOnly) {
    arr.push((req, res, next) => {
      if (req.method === 'GET') {
        next() // Continue
      } else {
        res.sendStatus(403) // Forbidden
      }
    })
  }

  // Global array has body parser
  // Add middlewares
  if (opts.bodyParser) {
    arr.push(bodyParser)
  }

  return arr
}
