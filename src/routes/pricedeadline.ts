import { Router } from 'express';
import pdClass from './classes/pricedeadlineClass';

// @ts-ignore
const router = new Router();

// Input example: {
// 	"language": "en", - document's language
// 	"mimetype": "none|doc|docx|rtf|other" - document's filetype, 'other' makes price bigger by uTypesTax(->config)
// 	"count": 10000
// }
// Output example: {
// 	"price": 3993996 //price, 100 stands for 1.00
// 	"time": "999:59:54.594" //time taken to complete task
// 	"deadline": 1675342794 //UNIX timestamp of deadline
// 	"deadlineDate": "2023-02-02T12:59:54.594Z" //deadline in Date form
// }
router.post('/calculate', pdClass.calculate);

export = router;
