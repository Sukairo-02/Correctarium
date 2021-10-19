const Router = require('express')
const router = new Router()
const pdClass = require('./classes/pricedeadlineClass')

//Input example: {
// 	"language": "en", - document's language
// 	"mimetype": "none|doc|docx|rtf|other" - document's filetype, 'other' makes price bigger by uTypesTax(->config)
// 	"count": 10000
// }
//Output example: {
// 	"price": 1000 //деньги
// 	"time": 1 //часы,
// 	"deadline": 1623822732 //UNIX таймстемп в секундах
// 	"deadline_date": "10/10/2021 12:00:00"
// }
router.post('/calculate', pdClass.calculate)

module.exports = router
