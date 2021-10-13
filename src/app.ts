const express = require('express')
const config = require('config')

const app = express()
const PORT = process.env.PORT || config.get('server.PORT')

const calculator = require('./routes/pricedeadline')

app.use(express.json({ extended: true }))
app.use('/calculator', calculator)
const start = async () => {
	try {
		app.listen(PORT, () => {
			console.log(`Server has been started at port ${PORT}.\n`)
		})
	} catch (e) {
		console.log(e)
	}
}

start()
