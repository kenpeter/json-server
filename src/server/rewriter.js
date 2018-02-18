// express
const express = require('express')
// express url rewrite
const rewrite = require('express-urlrewrite')

// Pass in new routes
module.exports = routes => {
  // router
  const router = express.Router()

  // see rules, then route
  router.get('/__rules', (req, res) => {
    res.json(routes)
  })

  // use those rewrite rules in json file
  Object.keys(routes).forEach(key => {
    router.use(rewrite(key, routes[key]))
  })

  return router
}
