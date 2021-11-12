import moment from 'moment-timezone';
import config from 'config';

enum intTime {
	second = 1000,
	minute = 60000,
	hour = 3600000,
	day = 86400000,
}

type corDline = {
	time: string;
	deadline: number;
	deadlineDate: Date;
};

type lang = {
	pl: number;
	min: number;
	lph: number;
};

class PDCalc {
	private _wTime: [number, number];

	private _wDays: [number, number];

	private _altTime: boolean;

	private _altDays: boolean;

	private _lang: lang;

	private _mType: string;

	private _letCnt: number;

	private _reqTime: Date;

	private _typeMod: number;

	constructor(lang: string, mType: string, letCnt: number, wTime?: [number, number] | undefined, wDays?: [number, number] | undefined, reqTime?: Date | undefined) {
		// work days (0 - sunday, 6 - saturday)
		this._wDays = wDays || config.get('calc.workDays');
		// determining order of work days (ex: monday to friday - false, friday to monday - true)
		this._altDays = this._wDays[1] < this._wDays[0];
		// work time in hours
		const tmpTime = wTime || config.get('calc.workTime');
		this._wTime = tmpTime ? [~~tmpTime[0], ~~tmpTime[1]] : [10, 15];
		// same for time (ex: 2:00 - 18:00 - false, 18:00 - 2:00 - true)
		this._altTime = this._wTime[1] < this._wTime[0];
		try {
			this._lang = config.get(`calc.lang.${lang}`);
		} catch {
			throw 'Unsupported language!';
		}
		this._mType = mType;
		if (letCnt <= 0) {
			throw 'Unacceptable amount of symbols!';
		}
		this._letCnt = letCnt;
		const discTypes: string[] = config.get('calc.discTypes') || [];
		this._typeMod = 1;
		if (!discTypes.find((a: string) => this._mType === a)) {
			this._typeMod = config.get('calc.uTypesTax');
		}
		this._reqTime = reqTime || new Date();
	}

	// same to Date.getTime() but in set zone instead of UTC
	private static _getTotalMillis(date: moment.Moment): number {
		return date.valueOf() + (intTime.minute * date.utcOffset() - +date.isDST() * intTime.hour);
	}

	// get today's time (H/M/S/MS only) in ms
	private static _getMillisToday(date: moment.Moment): number {
		return date.hour() * intTime.hour + date.minute() * intTime.minute + date.second() * intTime.second + date.millisecond();
	}

	private _isWorkDay(date: moment.Moment): boolean {
		const testable = moment(date);
		if (this._altTime && testable.hour() <= this._wTime[1]) {
			testable.subtract(this._wTime[1], 'h');
		}
		const day = testable.day();
		return !(this._altDays ? day < this._wDays[0] && day > this._wDays[1] : day > this._wDays[1] || day < this._wDays[0]);
	}

	private _isWorkTime(date: moment.Moment): boolean {
		const millis = PDCalc._getMillisToday(date);
		const mWorkTime: [number, number] = [this._wTime[0] * intTime.hour, this._wTime[1] * intTime.hour];
		return !(this._altTime ? millis >= mWorkTime[1] && millis < mWorkTime[0] : millis < mWorkTime[0] || millis >= mWorkTime[1]);
	}

	// moves date to beginning of workdays
	private _moveToWDay(date: moment.Moment) {
		date.add(this._wDays[0] - date.day() + 7 * +(date.day() >= this._wDays[0]), 'd');
	}

	private _moveToWTime(date: moment.Moment) {
		/* old method - could make DST change related erros
		const today = PDCalc._getMillisToday(date)

		date.add(
		 	this._wTime[0] * intTime.hour -
		 		today +
		 		intTime.day * +(today > this._wTime[0] * intTime.hour),
		 	'ms'
		) */
		const tmp = moment(date);
		if (this._wTime[0] < tmp.hour()) {
			tmp.add(1, 'd');
		}
		const target = moment(`${tmp.toISOString(true).substr(0, 10)}T${this._wTime[0] < 10 ? `0${this._wTime[0]}` : this._wTime[0]}:00:00`);
		date.add(PDCalc._getTotalMillis(target) - PDCalc._getTotalMillis(date), 'ms');
	}

	// fill remaining full days
	private _fillWorkDays(date: moment.Moment, toFill: number) {
		if (!this._isWorkDay(date)) {
			this._moveToWTime(date);
		}
		if (!this._isWorkDay(date)) {
			this._moveToWDay(date);
		}
		const daysLeft = 1 + this._wDays[1] + (this._altDays && date.day() >= this._wDays[0] ? 7 : 0) - date.day();

		if (daysLeft < toFill) {
			// eslint-disable-next-line no-param-reassign
			toFill -= daysLeft;
			date.add(daysLeft, 'd');
			this._moveToWDay(date);
		}
		date.add(toFill, 'd');
	}

	// fill remaining time
	private _fillWorkTime(date: moment.Moment, toFill: number) {
		if (!this._isWorkDay(date)) {
			this._moveToWDay(date);
		}

		if (!this._isWorkTime(date)) {
			this._moveToWTime(date);
		}

		const today = PDCalc._getMillisToday(date);
		const timeLeft = this._wTime[1] * intTime.hour + intTime.day * +this._altTime - (this._altTime ? today + (today < this._wTime[1] * intTime.hour ? intTime.day : 0) : today);

		if (timeLeft < toFill) {
			// eslint-disable-next-line no-param-reassign
			toFill -= timeLeft;
			date.add(timeLeft, 'ms');
			this._moveToWTime(date);
			if (!this._isWorkDay(date)) {
				this._moveToWDay(date);
			}
		}

		date.add(toFill, 'ms');
	}

	// if deadline points to beginning of workday, move it to the end of previous workday instead
	private _toEndTime(date: moment.Moment): moment.Moment {
		if (PDCalc._getMillisToday(date) !== this._wTime[0] * intTime.hour) {
			return date;
		}

		// getting the end of the last workday
		const testDay = moment(date)
			.add(-1, 'd')
			.add(this._wTime[1] + 24 * +this._altTime - this._wTime[0], 'h')
			.add(-1, 'ms');
		if (!this._isWorkDay(testDay)) {
			const sub = testDay.day() + 7 * +(!this._altDays && testDay.day() < this._wDays[0]) - this._wDays[1];
			testDay.subtract(sub, 'd');
		}

		testDay.add(1, 'ms');
		return testDay;
	}

	public getPrice(): number {
		const { pl, min } = this._lang;
		const price: number = Math.round(pl * this._typeMod * this._letCnt);
		const result = price < min ? min : price;
		return result;
	}

	public getDeadline(): corDline {
		// remember server's timezone
		const origTimezone = moment.tz.guess();
		// change timezone to config's
		moment.tz.setDefault(config.get('calc.timeZone'));

		// begin calculation with setting current time
		let dLine: moment.Moment = moment(this._reqTime);
		// days of work per week
		const dpw = 1 + (this._altDays ? 7 - this._wDays[0] + this._wDays[1] : this._wDays[1] - this._wDays[0]);

		// hours of work per day
		const hpd = this._altTime ? 24 - this._wTime[0] + this._wTime[1] : this._wTime[1] - this._wTime[0];

		// calculate completion time
		const minTime: number = config.get('calc.minTime');
		const estTime = ((this._letCnt / this._lang.lph) * intTime.hour + 30 * intTime.minute) * this._typeMod;
		let finalTime: number = estTime < minTime ? minTime : estTime;
		const resTime = Math.floor(finalTime);
		let fullDays = Math.floor(finalTime / (hpd * intTime.hour));
		finalTime -= fullDays * hpd * intTime.hour;
		const fullWeeks = Math.floor(fullDays / dpw);
		fullDays -= fullWeeks * dpw;

		// calculate deadline
		dLine.add(fullWeeks, 'w');
		this._fillWorkDays(dLine, fullDays);
		this._fillWorkTime(dLine, finalTime);
		dLine = this._toEndTime(dLine);

		// final bits for 'time' field in return
		const hours = Math.floor(resTime / intTime.hour);
		const minutes = Math.floor((resTime % intTime.hour) / intTime.minute);
		const seconds = Math.floor((resTime % intTime.minute) / intTime.second);
		const millis = resTime % intTime.second;

		moment.tz.setDefault(origTimezone);
		return {
			time: `${hours < 10 ? `0${hours}` : hours}:${minutes < 10 ? `0${minutes}` : minutes}:${seconds < 10 ? `0${seconds}` : seconds}.${(millis < 100 ? '0' : '') + (millis < 10 ? `0${millis}` : millis)}`,
			deadline: dLine.unix(),
			deadlineDate: dLine.toDate(),
		};
	}
}

export = PDCalc;
