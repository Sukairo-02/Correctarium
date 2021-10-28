import moment from 'moment-timezone'
const config = require('config')

enum intTime {
	second = 1000,
	minute = 60000,
	hour = 3600000,
	day = 86400000,
}

type corDline = {
	time: string
	deadline: number
	deadlineDate: Date
}

type lang = {
	pl: number
	min: number
	lph: number
}

class pdCalc {
	private wTime: [number, number]

	private wDays: [number, number]

	private altTime: boolean

	private altDays: boolean

	private lang: lang

	private mType: string

	private letCnt: number

	private reqTime: Date

	private typeMod: number

	constructor(
		lang: string,
		mType: string,
		letCnt: number,
		wTime?: [number, number] | undefined,
		wDays?: [number, number] | undefined,
		reqTime?: Date | undefined
	) {
		//work days (0 - sunday, 6 - saturday)
		this.wDays = wDays || config.get('calc.workDays')
		//determining order of work days (ex: monday to friday - false, friday to monday - true)
		this.altDays = this.wDays[1] < this.wDays[1]
		//work time in hours
		const tmpTime = wTime || config.get('calc.workTime')
		this.wTime = [~~tmpTime[0], ~~tmpTime[1]]
		//same for time (ex: 2:00 - 18:00 - false, 18:00 - 2:00 - true)
		this.altTime = this.wTime[1] < this.wTime[0]
		try {
			this.lang = config.get(`calc.lang.${lang}`)
		} catch {
			throw 'Unsupported language!'
		}
		this.mType = mType
		if (letCnt <= 0) {
			throw 'Unacceptable amount of symbols!'
		}
		this.letCnt = letCnt
		const discTypes = config.get('calc.discTypes')
		this.typeMod = 1
		if (!discTypes.find((a: string) => this.mType === a)) {
			this.typeMod = config.get('calc.uTypesTax')
		}
		this.reqTime = reqTime || new Date()
	}

	//same to Date.getTime() but in set zone instead of UTC
	private getTotalMillis(date: moment.Moment): number {
		return (
			date.valueOf() +
			(intTime.minute * date.utcOffset() - +date.isDST() * intTime.hour)
		)
	}

	//get today's time (H/M/S/MS only) in ms
	private getMillisToday(date: moment.Moment): number {
		return (
			date.hour() * intTime.hour +
			date.minute() * intTime.minute +
			date.second() * intTime.second +
			date.millisecond()
		)
	}

	private isWorkDay(date: moment.Moment): boolean {
		const testable = moment(date)
		if (
			this.altTime &&
			this.getMillisToday(date) < this.wTime[1] * intTime.hour
		) {
			testable.subtract(this.wTime[1], 'ms')
		}
		const day = testable.day()
		return !(this.altDays
			? day < this.wDays[0] && day > this.wDays[1]
			: day > this.wDays[1] || day < this.wDays[0])
	}

	private isWorkTime(date: moment.Moment): boolean {
		const millis = this.getMillisToday(date)
		const mWorkTime: [number, number] = [
			this.wTime[0] * intTime.hour,
			this.wTime[1] * intTime.hour,
		]
		return !(this.altTime
			? millis >= mWorkTime[1] && millis < mWorkTime[0]
			: millis < mWorkTime[0] || millis >= mWorkTime[1])
	}

	//moves date to beginning of workdays
	private moveToWDay(date: moment.Moment): boolean {
		date.add(
			this.wDays[0] - date.day() + 7 * +(date.day() >= this.wDays[0]),
			'd'
		)
		return true
	}

	private moveToWTime(date: moment.Moment): boolean {
		/*old method - could make DST change related erros
		const today = this.getMillisToday(date)
		
		date.add(
		 	this.wTime[0] * intTime.hour -
		 		today +
		 		intTime.day * +(today > this.wTime[0] * intTime.hour),
		 	'ms'
		)*/
		const tmp = moment(date)
		if (!this.altTime && this.wTime[0] <= tmp.hour()) {
			tmp.add(1, 'd')
		}
		const target = moment(
			tmp.toISOString(true).substr(0, 10) +
				' ' +
				(this.wTime[0] < 10 ? '0' + this.wTime[0] : this.wTime[0]) +
				':00:00'
		)
		date.add(this.getTotalMillis(target) - this.getTotalMillis(date), 'ms')
		return true
	}

	//fill remaining full days
	private fillWorkDays(date: moment.Moment, toFill: number) {
		if (!this.isWorkDay(date)) {
			this.moveToWDay(date)
		}
		const daysLeft = 1 + this.wDays[1] + 7 * +this.altDays - date.day()
		if (daysLeft < toFill) {
			toFill -= daysLeft
			date.add(daysLeft, 'd')
			this.moveToWDay(date)
		}
		date.add(toFill, 'd')
	}

	//fill remaining time
	private fillWorkTime(date: moment.Moment, toFill: number) {
		if (!this.isWorkDay(date)) {
			this.moveToWDay(date)
		}

		if (!this.isWorkTime(date)) {
			this.moveToWTime(date)
		}

		const today = this.getMillisToday(date)
		let timeLeft =
			this.wTime[1] * intTime.hour +
			intTime.day * +this.altTime -
			(this.altTime
				? today +
				  (today < this.wTime[1] * intTime.hour ? intTime.day : 0)
				: today)

		if (timeLeft < toFill) {
			toFill -= timeLeft
			date.add(timeLeft, 'ms')
			this.moveToWTime(date)
			if (!this.isWorkDay(date)) {
				this.moveToWDay(date)
			}
		}

		date.add(toFill, 'ms')
	}

	//if deadline points to beginning of workday, move it to the end of previous workday instead
	private toEndTime(date: moment.Moment): moment.Moment {
		if (this.getMillisToday(date) != this.wTime[0] * intTime.hour) {
			return date
		}

		//getting the end of the last workday
		const testDay = moment(date)
			.add(-1, 'd')
			.add(this.wTime[1] + 24 * +this.altTime - this.wTime[0], 'h')
			.add(-1, 'ms')
		if (!this.isWorkDay(testDay)) {
			const sub =
				testDay.day() +
				7 * +(!this.altDays && testDay.day() < this.wDays[0]) -
				this.wDays[1]
			testDay.subtract(sub, 'd')
		}

		testDay.add(1, 'ms')
		return testDay
	}

	public getPrice(): number {
		let { pl, min } = this.lang
		const price: number = Math.round(pl * this.typeMod * this.letCnt)
		const result = price < min ? min : price
		return result
	}

	public getDeadline(): corDline {
		//remember server's timezone
		const origTimezone = moment.tz.guess()
		//change timezone to config's
		moment.tz.setDefault(config.get('calc.timeZone'))

		//begin calculation with setting current time
		let dLine: moment.Moment = moment(this.reqTime)
		//days of work per week
		const dpw =
			1 +
			(this.altDays
				? 7 - this.wDays[0] + this.wDays[0]
				: this.wDays[1] - this.wDays[0])

		//hours of work per day
		const hpd = this.altTime
			? 24 - this.wTime[0] + this.wTime[1]
			: this.wTime[1] - this.wTime[0]

		//calculate completion time
		const minTime = config.get('calc.minTime')
		const estTime =
			((this.letCnt / this.lang.lph) * intTime.hour +
				30 * intTime.minute) *
			this.typeMod
		let finalTime = estTime < minTime ? minTime : estTime
		const resTime = Math.floor(finalTime)
		let fullDays = Math.floor(finalTime / (hpd * intTime.hour))
		finalTime -= fullDays * hpd * intTime.hour
		let fullWeeks = Math.floor(fullDays / dpw)
		fullDays -= fullWeeks * dpw

		//calculate deadline
		dLine.add(fullWeeks, 'w')
		this.fillWorkDays(dLine, fullDays)
		this.fillWorkTime(dLine, finalTime)
		dLine = this.toEndTime(dLine)

		//final bits for 'time' field in return
		const hours = Math.floor(resTime / intTime.hour)
		const minutes = Math.floor((resTime % intTime.hour) / intTime.minute)
		const seconds = Math.floor((resTime % intTime.minute) / intTime.second)
		const millis = resTime % intTime.second

		moment.tz.setDefault(origTimezone)
		return {
			time:
				'' +
				(hours < 10 ? '0' + hours : hours) +
				':' +
				(minutes < 10 ? '0' + minutes : minutes) +
				':' +
				(seconds < 10 ? '0' + seconds : seconds) +
				'.' +
				((millis < 100 ? '0' : '') +
					(millis < 10 ? '0' + millis : millis)),
			deadline: dLine.unix(),
			deadlineDate: dLine.toDate(),
		}
	}
}

export = pdCalc
