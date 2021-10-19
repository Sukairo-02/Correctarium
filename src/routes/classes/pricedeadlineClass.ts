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

enum intTime {
	second = 1000,
	minute = 60000,
	hour = 3600000,
	day = 86400000,
}

function getDeadline(lang: string, letCnt: number): corDline {
	const oldTz = process.env.TZ
	console.log(oldTz)
	//changing timeZone to UTC
	process.env.TZ = 'UTC'
	console.log(process.env.TZ)
	let lph: number
	try {
		;({ lph } = config.get(`calc.lang.${lang}`))
	} catch (e) {
		throw 'Unsupported language!'
	}

	//getting current time in set timezone
	let deadline: Date = new Date()

	//work schedule in days
	const wDays: [number, number] = config.get('calc.workDays')
	//determining order of work days (ex: monday to friday - false, friday to monday - true)
	const altDays: boolean = wDays[1] < wDays[0]
	//work schedule in hours
	const wTime: [number, number] = config.get('calc.workTime')
	//same for time (ex: 2:00 - 18:00 - false, 18:00 - 2:00 - true)
	const altTime: boolean = wTime[1] < wTime[0]

	//hours of work per day
	const hpd = altTime ? 24 - wTime[0] + wTime[1] : wTime[1] - wTime[0]
	//calculate completion time
	const minTime = config.get('calc.minTime')
	const estTime = (letCnt / lph) * intTime.hour + 30 * intTime.minute
	let finalTime = estTime < minTime ? minTime : estTime
	const resTime = Math.floor(finalTime)

	let today = new Date(
		new Date(
			new Date(0).toDateString() + ', ' + deadline.toTimeString()
		).toLocaleString('en-GB', { timeZone: config.get('calc.timeZone') })
	).getTime()

	console.log('Init deadline:', deadline)
	console.log(today)

	//Calculate deadline
	//start with resetting current day to 00:00 for simpler calculation
	//rewinded worktime will be added to completion time
	if (altTime) {
		if (
			today < wTime[0] * intTime.hour &&
			today >= wTime[1] * intTime.hour
		) {
			finalTime += wTime[1] * intTime.hour
			console.log('FinalTimeCase1: ', finalTime)
		} else if (today >= 0 && today < wTime[1] * intTime.hour) {
			finalTime += today
			console.log('FinalTimeCase2: ', finalTime)
		} else {
			console.log(finalTime)
			finalTime +=
				wTime[1] * intTime.hour + today - intTime.hour * wTime[0]
			console.log('FinalTimeCase3: ', finalTime)
		}
	} else {
		if (
			today >= wTime[0] * intTime.hour &&
			today < wTime[1] * intTime.hour
		) {
			finalTime += today - wTime[0] * intTime.hour
		} else if (today >= wTime[1] * intTime.hour) {
			finalTime += (wTime[1] - wTime[0]) * intTime.hour
		}
	}

	console.log(altDays, altTime)

	console.log('Final time: ', new Date(finalTime))
	let fullDays = Math.floor(finalTime / (hpd * intTime.hour))
	finalTime -= fullDays * hpd * intTime.hour
	console.log('Full days: ', fullDays)
	console.log('Final time: ', new Date(finalTime))
	while (fullDays) {
		let move = 0
		const day = deadline.getDay()
		//if today is in workdays, move to the end of work week,
		//subtracting passed days from calculated days to finish processing
		if (
			altDays
				? day >= wDays[0] || day <= wDays[1]
				: day >= wDays[0] && day <= wDays[1]
		) {
			//determining how much days is left untill end of work week
			const tillEnd =
				1 +
				(altDays
					? day >= wDays[0]
						? 6 - day + wDays[1]
						: wDays[1] - day
					: wDays[1] - day)
			move = fullDays > tillEnd ? tillEnd : fullDays
			fullDays -= move
		} else {
			//else move to the beginning of work week
			move =
				1 +
				(altDays
					? wDays[0] - day
					: day < wDays[0]
					? wDays[0] - day
					: 6 - day + wDays[0])
		}

		deadline = new Date(deadline.getTime() + move * intTime.day)
	}

	console.log('Deadline after days:', deadline)

	//if there's still time to fill, go to the beginning of work day and add remaining time
	//but if there's none left, set deadline to be the end of last day's workday in case of altDays = false
	//for altDays = true, calculation be considered done.
	if (altDays) {
		deadline = new Date(
			deadline.getTime() +
				(finalTime > wTime[1] * intTime.hour
					? wTime[0] * intTime.hour +
					  finalTime -
					  wTime[0] * intTime.hour
					: finalTime)
		)
	} else {
		deadline = new Date(
			deadline.getTime() +
				(finalTime
					? finalTime + wTime[0] * intTime.hour
					: -1 * (intTime.day - wTime[1] * intTime.hour))
		)
	}
	console.log('OPDLSJMG', new Date(finalTime))

	//final bits for 'time' field in return
	console.log(new Date(resTime))
	const hours = Math.floor(resTime / intTime.hour)
	const minutes = Math.floor((resTime % intTime.hour) / intTime.minute)
	const seconds = Math.floor((resTime % intTime.minute) / intTime.second)
	const millis = resTime % intTime.second

	let result: corDline = {
		time: '' + hours + ':' + minutes + ':' + seconds + '.' + millis,
		deadline: Math.floor(deadline.getTime() / 1000),
		deadlineDate: deadline,
	}

	//return to server's original timezone
	process.env.TZ = oldTz
	return result
}

class pdCalculator {
	public calculate: RequestHandler = (req, res) => {
		try {
			const reqData: reqType = (<any>req).body
			const { language, mimetype, count } = reqData

			let price: number, deadline: corDline
			try {
				price = getPrice(language, mimetype, count)
				deadline = getDeadline(language, count)
			} catch (er) {
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
