const Router = require('express')
const router = new Router()
const pdClass = require('./classes/pricedeadlineClass')

router.post('/calculate', pdClass.calculate)

module.exports = router
