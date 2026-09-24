/**
 * STATWISE server entry point.
 * Express API + static frontend hosting in one process for simple deployment.
 */
const path = require('node:path')
const fs = require('node:fs')
const express = require('express')
const { sessionMiddleware } = require('./auth')
const { seedIfEmpty } = require('./seed')
const routes = require('./routes')

const app = express()
const PORT = Number(process.env.PORT) > 0 ? Number(process.env.PORT) : 3000

app.disable('x-powered-by')
app.use(express.json({ limit: '6mb' }))
app.use(sessionMiddleware)

app.use('/api', routes)

app.use('/api', (req, res) => res.status(404).json({ error: 'API route not found' }))

// Serve built frontend in production
const DIST = path.join(__dirname, '..', 'dist')
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST))
  app.get(/.*/, (req, res) => res.sendFile(path.join(DIST, 'index.html')))
} else if (process.env.NODE_ENV !== 'test') {
  app.get('/', (req, res) => res.send('STATWISE API running. Build the frontend with `npm run build` or use the Vite dev server.'))
}

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[server error]', err.message)
  res.status(err.status || 500).json({ error: err.expose ? err.message : 'Internal server error' })
})

seedIfEmpty()

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`STATWISE server listening on http://localhost:${PORT}`)
  })
}

module.exports = app
