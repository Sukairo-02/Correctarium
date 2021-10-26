import { RequestHandler } from 'express'
import pdCalc from './utility/pdCalc'
const config = require('config')

type reqType = {
	language: string
	mimetype: string
	count: number
}

type corDline = {
	time: string
	deadline: number
	deadlineDate: Date
}

class pdCalculator {
	public calculate: RequestHandler = (req, res) => {
		try {
			const reqData: reqType = (<any>req).body
			const { language, mimetype, count } = reqData
			let price: number, deadline: corDline
			try {
				let pdc = new pdCalc(language, mimetype, count)
				price = pdc.getPrice()
				deadline = pdc.getDeadline()
			} catch (er) {
				console.log(er)
				return res.status(403).json({ er })
			}

			return res.json({
				price,
				time: deadline.time,
				deadline: deadline.deadline,
				deadlineDate: deadline.deadlineDate,
			})
		} catch (e) {
			console.log(e)
			return res.status(501).json({
				msg: 'Error occured while processing data. Please, try again later.',
			})
		}
	}
}

module.exports = new pdCalculator()
