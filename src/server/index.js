//
const express = require('express')

module.exports = {
  // express
  create: () => express().set('json spaces', 2),
  // File path + util array
  defaults: require('./defaults'),
  // router
  router: require('./router'),
  // rewrite
  rewriter: require('./rewriter'),
  // submit body parser
  bodyParser: require('./body-parser')
}
