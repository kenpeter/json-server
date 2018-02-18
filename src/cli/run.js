//
const fs = require('fs')
const path = require('path')
const jph = require('json-parse-helpfulerror')
const _ = require('lodash')

//
const chalk = require('chalk')
const enableDestroy = require('server-destroy')
const pause = require('connect-pause')

//
const is = require('./utils/is')
const load = require('./utils/load')
const example = require('./example.json')
const jsonServer = require('../server')

// argv, root url
// obj, uri
// rules
function prettyPrint(argv, object, rules) {
  // Build root url
  const host = argv.host === '0.0.0.0' ? 'localhost' : argv.host
  const port = argv.port
  const root = `http://${host}:${port}`

  // Object is uri
  // Loop object and print
  console.log()
  console.log(chalk.bold('  Resources'))
  for (let prop in object) {
    console.log(`  ${root}/${prop}`)
  }

  // What is rule?
  if (rules) {
    console.log()
    console.log(chalk.bold('  Other routes'))
    for (var rule in rules) {
      console.log(`  ${rule} -> ${rules[rule]}`)
    }
  }

  console.log()
  console.log(chalk.bold('  Home'))
  console.log(`  ${root}`)
  console.log()
}

// Part of func
function createApp(source, object, routes, middlewares, argv) {
  // Create server
  const app = jsonServer.create()

  // Router
  let router

  // foreign_key.xyz
  const { foreignKeySuffix } = argv

  try {
    // Create routes for server
    // Use source or object
    // foreign_key.xyz
    router = jsonServer.router(
      is.JSON(source) ? source : object,
      foreignKeySuffix ? { foreignKeySuffix } : undefined
    )
  } catch (e) {
    // Error
    console.log()
    console.error(chalk.red(e.message.replace(/^/gm, '  ')))
    process.exit(1)
  }

  const defaultsOpts = {
    // Log msg
    logger: !argv.quiet,
    // Read only
    readOnly: argv.readOnly,
    // Cross domain
    noCors: argv.noCors,
    // zip
    noGzip: argv.noGzip,
    // Body parser, request body, parse what is submit
    bodyParser: true
  }

  // static path
  // a/b/c/d
  if (argv.static) {
    defaultsOpts.static = path.join(process.cwd(), argv.static)
  }

  // static server builds default
  const defaults = jsonServer.defaults(defaultsOpts)
  // server instance uses default
  app.use(defaults)

  // route can rewrite
  // static server builds rewrite
  if (routes) {
    const rewriter = jsonServer.rewriter(routes)
    // server instance use rewrite
    app.use(rewriter)
  }

  // static server use middle ware
  if (middlewares) {
    app.use(middlewares)
  }

  // static server use delay
  if (argv.delay) {
    app.use(pause(argv.delay))
  }

  // server instance router, db, lodash, id
  // arg id
  router.db._.id = argv.id
  // server instance uses router db
  app.db = router.db
  // server instance use router
  app.use(router)

  // return server instance
  return app
}

// We some how export it...
module.exports = function(argv) {
  // Source
  const source = argv._[0]
  // ?
  let app
  // ?
  let server

  // Data dir snapshot
  if (!fs.existsSync(argv.snapshots)) {
    console.log(`Error: snapshots directory ${argv.snapshots} doesn't exist`)
    process.exit(1)
  }

  // Don't log anything
  // noop log fn
  if (argv.quiet) {
    console.log = () => {}
  }

  //
  console.log()
  console.log(chalk.cyan('  \\{^_^}/ hi!'))

  // Why we don't define it outside...
  // Part of method
  function start(cb) {
    //
    console.log()

    // Be nice and create a default db.json if it doesn't exist
    // Source is the database file
    if (is.JSON(source) && !fs.existsSync(source)) {
      console.log(chalk.yellow(`  Oops, ${source} doesn't seem to exist`))
      console.log(chalk.yellow(`  Creating ${source} with some default data`))
      console.log()

      // database file not there, create default
      fs.writeFileSync(source, JSON.stringify(example, null, 2))
    }

    //
    console.log(chalk.gray('  Loading', source))

    // Load JSON, JS or HTTP database
    // Load then callback
    load(source, (err, data) => {
      //
      if (err) throw err

      // Load additional routes
      // outside routes
      let routes
      // Load outside route
      if (argv.routes) {
        console.log(chalk.gray('  Loading', argv.routes))
        routes = JSON.parse(fs.readFileSync(argv.routes))
      }

      // Load outside lib
      let middlewares
      if (argv.middlewares) {
        middlewares = argv.middlewares.map(function(m) {
          console.log(chalk.gray('  Loading', m))
          return require(path.resolve(m))
        })
      }

      // Done
      console.log(chalk.gray('  Done'))

      // Create express instance
      app = createApp(source, data, routes, middlewares, argv)
      // Express app listens, becomes server
      server = app.listen(argv.port, argv.host)

      // Destroy server, can
      // Enhance with a destroy function
      enableDestroy(server)

      // print server info
      // Display server informations
      prettyPrint(argv, data, routes)

      // Call back from outside
      cb && cb()
    })
  }

  // Start server
  start(() => {
    // Save the state of db
    // Snapshot
    console.log(
      chalk.gray(
        '  Type s + enter at any time to create a snapshot of the database'
      )
    )

    // Support nohup
    // https://github.com/typicode/json-server/issues/221
    // Cannot read std input, error
    process.stdin.on('error', () => {
      console.log(`  Error, can't read from stdin`)
      console.log(`  Creating a snapshot from the CLI won't be possible`)
    })

    // utf 8
    process.stdin.setEncoding('utf8')

    process.stdin.on('data', chunk => {
      // On data
      // chunk, data
      if (chunk.trim().toLowerCase() === 's') {
        // date file name
        const filename = `db-${Date.now()}.json`
        // file dir path
        const file = path.join(argv.snapshots, filename)
        // Get db state from MEM
        const state = app.db.getState()
        // Write state to file
        fs.writeFileSync(file, JSON.stringify(state, null, 2), 'utf-8')
        console.log(
          `  Saved snapshot to ${path.relative(process.cwd(), file)}\n`
        )
      }
    })

    // Watch files
    if (argv.watch) {
      // Watch
      console.log(chalk.gray('  Watching...'))
      console.log()
      const source = argv._[0]

      // Can't watch URL
      // DB not url, throw
      if (is.URL(source)) throw new Error("Can't watch URL")

      // Watch .js or .json file
      // Since lowdb uses atomic writing, directory is watched instead of file
      // lock down dir????
      const watchedDir = path.dirname(source)

      //
      let readError = false

      // watch dir
      fs.watch(watchedDir, (event, file) => {
        // https://github.com/typicode/json-server/issues/420
        // file can be null
        if (file) {
          // Get file path
          const watchedFile = path.resolve(watchedDir, file)

          // The dir we watch same as our db file
          if (watchedFile === path.resolve(source)) {
            // db is json
            if (is.JSON(watchedFile)) {
              let obj
              try {
                // Read and parse json db
                obj = jph.parse(fs.readFileSync(watchedFile))
                // It tries to fix????
                if (readError) {
                  console.log(chalk.green(`  Read error has been fixed :)`))
                  readError = false
                }
              } catch (e) {
                // ....
                readError = true
                console.log(chalk.red(`  Error reading ${watchedFile}`))
                console.error(e.message)
                return
              }

              // Compare .json file content with in memory database
              // database in mem not same as the one in file...., destroy
              const isDatabaseDifferent = !_.isEqual(obj, app.db.getState())
              if (isDatabaseDifferent) {
                console.log(chalk.gray(`  ${source} has changed, reloading...`))

                // reload server
                server && server.destroy()
                start()
              }
            }
          }
        }
      })

      // Watch routes......
      if (argv.routes) {
        // actually, the route is in file
        const watchedDir = path.dirname(argv.routes)
        // Watch
        fs.watch(watchedDir, (event, file) => {
          if (file) {
            const watchedFile = path.resolve(watchedDir, file)
            // File path from outside?????
            if (watchedFile === path.resolve(argv.routes)) {
              console.log(
                chalk.gray(`  ${argv.routes} has changed, reloading...`)
              )
              // reload server
              server && server.destroy()
              start()
            }
          }
        })
      }
    }
  })
}
