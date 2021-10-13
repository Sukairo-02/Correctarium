import { RequestHandler } from 'express'
const config = require('config')

type corDline = {
	time: string
	deadline: number
	deadlineDate: Date
}

type reqType = {
	language: string
	mimetype: string
	count: number
}

function getPrice(lang: string, mType: string, letCnt: number): number {
	if (letCnt <= 0) {
		throw 'Unacceptable amount of symbols!'
	}

	let pl: number, min: number
	try {
		;({ pl, min } = config.get(`calc.lang.${lang}`))
	} catch (e) {
		throw 'Unsupported language!'
	}

	const discTypes = config.get('calc.discTypes')
	let typeMod: number = 1
	if (!discTypes.find((a: string) => mType === a)) {
		typeMod = config.get('calc.uTypesTax')
	}
	const price: number = pl * typeMod * letCnt
	const result = price < min ? min : price
	return result
}

// function getDeadline(): corDline {
// 	return
// }

class pdCalculator {
	public calculate: RequestHandler = (req, res) => {
		try {
			const reqData: reqType = (<any>req).body
			const { language, mimetype, count } = reqData

			let price: number
			try {
				price = getPrice(language, mimetype, count)
			} catch (er) {
				return res.status(403).json({ er })
			}

			return res.json(price)
		} catch (e) {
			console.log(e)
			return res.status(501).json({
				msg: 'Error occured while processing data. Please, try again later.',
			})
		}
	}
}

module.exports = new pdCalculator()
