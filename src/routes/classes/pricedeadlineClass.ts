import { RequestHandler } from 'express'
const config = require('config')

type corPrice = {
	price: number
	error?: string
}

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

function getPrice(lang: string, mType: string, letCnt: number): corPrice {
	let result: corPrice = { price: 0 }
	try {
		const { pl: langPrice, min: minPrice } = config.get(`calc.lang.${lang}`)

		const discTypes = config.get('calc.discTypes')
		let typeMod: number = 1
		if (!discTypes.find((a: string) => mType === a)) {
			typeMod = config.get('calc.uTypesTax')
		}

		if (letCnt <= 0) {
			result.error = 'Unacceptable amount of symbols!'
			return result
		}
		const price = langPrice * typeMod * letCnt
		result.price = price < minPrice ? minPrice : price
		return result
	} catch (e) {
		result.error = 'Unsupported language!'
		return result
	}
}

// function getDeadline(): corDline {
// 	return
// }

class pdCalculator {
	public calculate: RequestHandler = (req, res) => {
		try {
			const reqData: reqType = (<any>req).body
			const { language, mimetype, count } = reqData

			const price: corPrice = getPrice(language, mimetype, count)
			if (price.error) {
				return res.status(400).json({ error: price.error })
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
