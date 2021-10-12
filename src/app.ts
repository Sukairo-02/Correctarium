import config from 'config'
import express from 'express'

const app = express()
const PORT = process.env.PORT || config.get('server.PORT')

const start = async () => {
	try {
		app.listen(PORT, () => {
			console.log(`Server has been started at port ${PORT}.\n`)
		})
	} catch (e) {
		console.log(e)
	}
}
