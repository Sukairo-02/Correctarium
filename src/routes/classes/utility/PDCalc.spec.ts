import moment from 'moment-timezone';
import PDCalc from './PDCalc';

describe('Constructor tests:', () => {
	test('Language error', () => {
		expect(() => new PDCalc('fr', 'doc', 1333)).toThrowError('Unsupported language!');
	});

	test('Symbol amount error', () => {
		expect(() => new PDCalc('en', 'doc', -2)).toThrowError('Unacceptable amount of symbols!');
	});
});

describe('Price tests:', () => {
	test('Minimal price: english', () => {
		expect(new PDCalc('en', 'doc', 10).getPrice()).toBe(12000);
	});

	test('Minimal price: russian', () => {
		expect(new PDCalc('ru', 'rtf', 5).getPrice()).toBe(5000);
	});

	test('Minimal price: ukrainian', () => {
		expect(new PDCalc('uk', 'what?', 1).getPrice()).toBe(5000);
	});

	test('Regular price', () => {
		expect(new PDCalc('en', 'doc', 2000).getPrice()).toBe(24000);
	});

	test('Taxed type price', () => {
		expect(new PDCalc('uk', 'html', 2000).getPrice()).toBe(12000);
	});
});

let momentTZ: string;

describe('Processing time tests:', () => {
	test('Minimal time', () => {
		expect(new PDCalc('en', 'doc', 333).getDeadline().time).toBe('01:30:00.000');
	});

	test('English time', () => {
		expect(new PDCalc('en', 'doc', 3330).getDeadline().time).toBe('10:30:00.000');
	});

	test('Russian time', () => {
		expect(new PDCalc('ru', 'doc', 13330).getDeadline().time).toBe('10:30:00.000');
	});

	test('Ukrainian time', () => {
		expect(new PDCalc('uk', 'doc', 13330).getDeadline().time).toBe('10:30:00.000');
	});

	test('Unknown filetype time', () => {
		expect(new PDCalc('uk', 'html', 13330).getDeadline().time).toBe('12:36:00.000');
	});
});

describe('Deadline tests [normal worktime, normal workdays]:', () => {
	beforeAll(() => {
		momentTZ = moment.tz.guess();
		moment.tz.setDefault('Europe/Kiev');
	});

	afterAll(() => {
		moment.tz.setDefault(momentTZ);
	});

	test('Move to worktime', () => {
		expect(new PDCalc('en', 'doc', 333, [10, 15], [1, 5], moment('2021-07-01 05:15:32').toDate()).getDeadline().deadlineDate).toStrictEqual(moment('2021-07-01 11:30:00').toDate());
	});

	test('Move to workday', () => {
		expect(new PDCalc('en', 'doc', 333, [10, 15], [1, 5], moment('2021-07-03 10:00:00').toDate()).getDeadline().deadlineDate).toStrictEqual(moment('2021-07-05 11:30:00').toDate());
	});

	test('Move to workday and worktime', () => {
		expect(new PDCalc('en', 'doc', 333, [11, 16], [2, 5], moment('2021-07-03 05:15:32').toDate()).getDeadline().deadlineDate).toStrictEqual(moment('2021-07-06 12:30:00').toDate());
	});

	test('Completion time exceeds worktime', () => {
		expect(new PDCalc('en', 'doc', 333, [10, 15], [1, 5], moment('2021-07-01 14:15:00').toDate()).getDeadline().deadlineDate).toStrictEqual(moment('2021-07-02 10:45:00').toDate());
	});

	test('Completion time exceeds workdays', () => {
		expect(
			new PDCalc(
				'en',
				'doc',
				6493.5, // yes, this lettercount doesn't make sense, but is the only certain way for testing toEndTime() without spending extra time for calculating setup for test
				[10, 15],
				[1, 5],
				moment('2021-07-01 10:00:00').toDate(),
			).getDeadline().deadlineDate,
		).toStrictEqual(moment('2021-07-06 15:00:00').toDate());
	});

	test('Completion time exceeds worktime and workdays', () => {
		expect(new PDCalc('en', 'doc', 36630, [10, 15], [1, 5], moment('2021-07-01 14:15:00').toDate()).getDeadline().deadlineDate).toStrictEqual(moment('2021-08-02 14:45:00').toDate());
	});

	test('Regular case', () => {
		expect(new PDCalc('en', 'doc', 333, [10, 15], [1, 5], moment('2021-07-02 11:15:00').toDate()).getDeadline().deadlineDate).toStrictEqual(moment('2021-07-02 12:45:00').toDate());
	});

	test('Move to and exceed worktime', () => {
		expect(new PDCalc('en', 'doc', 1665, [10, 15], [1, 5], moment('2021-07-03 10:15:00').toDate()).getDeadline().deadlineDate).toStrictEqual(moment('2021-07-06 10:30:00').toDate());
	});
});

describe('Deadline tests [alter worktime, normal workdays]:', () => {
	beforeAll(() => {
		momentTZ = moment.tz.guess();
		moment.tz.setDefault('Europe/Kiev');
	});

	afterAll(() => {
		moment.tz.setDefault(momentTZ);
	});

	test('Move to worktime', () => {
		expect(new PDCalc('en', 'doc', 333, [22, 3], [1, 5], moment('2021-07-01 05:15:32').toDate()).getDeadline().deadlineDate).toStrictEqual(moment('2021-07-01 23:30:00').toDate());
	});

	test('Move to workday', () => {
		expect(new PDCalc('en', 'doc', 333, [22, 3], [1, 5], moment('2021-07-03 22:00:00').toDate()).getDeadline().deadlineDate).toStrictEqual(moment('2021-07-05 23:30:00').toDate());
	});

	test('Move to workday and worktime', () => {
		expect(new PDCalc('en', 'doc', 333, [23, 4], [2, 5], moment('2021-07-03 05:15:32').toDate()).getDeadline().deadlineDate).toStrictEqual(moment('2021-07-07 00:30:00').toDate());
	});

	test('Completion time exceeds worktime', () => {
		expect(new PDCalc('en', 'doc', 333, [22, 3], [1, 5], moment('2021-07-01 02:15:00').toDate()).getDeadline().deadlineDate).toStrictEqual(moment('2021-07-01 22:45:00').toDate());
	});

	test('Completion time exceeds workdays', () => {
		expect(
			new PDCalc(
				'en',
				'doc',
				6493.5, // yes, this lettercount doesn't make sense, but is the only certain way for testing toEndTime() without spending extra time for calculating setup for test
				[22, 3],
				[1, 5],
				moment('2021-07-01 22:00:00').toDate(),
			).getDeadline().deadlineDate,
		).toStrictEqual(moment('2021-07-07 03:00:00').toDate());
	});

	test('Completion time exceeds worktime and workdays', () => {
		expect(new PDCalc('en', 'doc', 36630, [22, 3], [1, 5], moment('2021-07-02 2:15:00').toDate()).getDeadline().deadlineDate).toStrictEqual(moment('2021-08-03 02:45:00').toDate());
	});

	test('Regular case', () => {
		expect(new PDCalc('en', 'doc', 333, [22, 3], [1, 5], moment('2021-07-02 23:15:00').toDate()).getDeadline().deadlineDate).toStrictEqual(moment('2021-07-03 00:45:00').toDate());
	});

	test('Move to and exceed worktime', () => {
		expect(new PDCalc('en', 'doc', 1665, [22, 3], [1, 5], moment('2021-07-03 22:15:00').toDate()).getDeadline().deadlineDate).toStrictEqual(moment('2021-07-06 22:30:00').toDate());
	});
});

describe('Deadline tests [normal worktime, alter workdays]:', () => {
	beforeAll(() => {
		momentTZ = moment.tz.guess();
		moment.tz.setDefault('Europe/Kiev');
	});

	afterAll(() => {
		moment.tz.setDefault(momentTZ);
	});

	test('Move to worktime', () => {
		expect(new PDCalc('en', 'doc', 333, [10, 15], [5, 2], moment('2021-07-02 05:15:32').toDate()).getDeadline().deadlineDate).toStrictEqual(moment('2021-07-02 11:30:00').toDate());
	});

	test('Move to workday', () => {
		expect(new PDCalc('en', 'doc', 333, [10, 15], [5, 2], moment('2021-07-01 10:00:00').toDate()).getDeadline().deadlineDate).toStrictEqual(moment('2021-07-02 11:30:00').toDate());
	});

	test('Move to workday and worktime', () => {
		expect(new PDCalc('en', 'doc', 333, [11, 16], [6, 2], moment('2021-07-01 05:15:32').toDate()).getDeadline().deadlineDate).toStrictEqual(moment('2021-07-03 12:30:00').toDate());
	});

	test('Completion time exceeds worktime', () => {
		expect(new PDCalc('en', 'doc', 333, [10, 15], [5, 2], moment('2021-07-02 14:15:00').toDate()).getDeadline().deadlineDate).toStrictEqual(moment('2021-07-03 10:45:00').toDate());
	});

	test('Completion time exceeds workdays', () => {
		expect(
			new PDCalc(
				'en',
				'doc',
				6493.5, // yes, this lettercount doesn't make sense, but is the only certain way for testing toEndTime() without spending extra time for calculating setup for test
				[10, 15],
				[5, 2],
				moment('2021-07-06 10:00:00').toDate(),
			).getDeadline().deadlineDate,
		).toStrictEqual(moment('2021-07-11 15:00:00').toDate());
	});

	test('Completion time exceeds worktime and workdays', () => {
		expect(new PDCalc('en', 'doc', 36630, [10, 15], [5, 2], moment('2021-07-05 14:15:00').toDate()).getDeadline().deadlineDate).toStrictEqual(moment('2021-08-06 14:45:00').toDate());
	});

	test('Regular case', () => {
		expect(new PDCalc('en', 'doc', 333, [10, 15], [5, 2], moment('2021-07-02 11:15:00').toDate()).getDeadline().deadlineDate).toStrictEqual(moment('2021-07-02 12:45:00').toDate());
	});

	test('Move to and exceed worktime', () => {
		expect(new PDCalc('en', 'doc', 1665, [22, 3], [5, 2], moment('2021-07-01 22:15:00').toDate()).getDeadline().deadlineDate).toStrictEqual(moment('2021-07-03 22:30:00').toDate());
	});
});

describe('Deadline tests [alter worktime, alter workdays]:', () => {
	beforeAll(() => {
		momentTZ = moment.tz.guess();
		moment.tz.setDefault('Europe/Kiev');
	});

	afterAll(() => {
		moment.tz.setDefault(momentTZ);
	});

	test('Move to worktime', () => {
		expect(new PDCalc('en', 'doc', 333, [22, 3], [5, 2], moment('2021-07-02 05:15:32').toDate()).getDeadline().deadlineDate).toStrictEqual(moment('2021-07-02 23:30:00').toDate());
	});

	test('Move to workday', () => {
		expect(new PDCalc('en', 'doc', 333, [22, 3], [5, 2], moment('2021-07-01 22:00:00').toDate()).getDeadline().deadlineDate).toStrictEqual(moment('2021-07-02 23:30:00').toDate());
	});

	test('Move to workday and worktime', () => {
		expect(new PDCalc('en', 'doc', 333, [23, 4], [6, 2], moment('2021-07-01 05:15:32').toDate()).getDeadline().deadlineDate).toStrictEqual(moment('2021-07-04 00:30:00').toDate());
	});

	test('Completion time exceeds worktime', () => {
		expect(new PDCalc('en', 'doc', 1665, [22, 3], [5, 2], moment('2021-07-02 22:15:00').toDate()).getDeadline().deadlineDate).toStrictEqual(moment('2021-07-03 22:45:00').toDate());
	});

	test('Completion time exceeds workdays', () => {
		expect(
			new PDCalc(
				'en',
				'doc',
				6493.5, // yes, this lettercount doesn't make sense, but is the only certain way for testing toEndTime() without spending extra time for calculating setup for test
				[22, 3],
				[5, 2],
				moment('2021-07-05 22:00:00').toDate(),
			).getDeadline().deadlineDate,
		).toStrictEqual(moment('2021-07-11 03:00:00').toDate());
	});

	test('Completion time exceeds worktime and workdays', () => {
		expect(new PDCalc('en', 'doc', 36630, [22, 3], [5, 2], moment('2021-07-06 2:15:00').toDate()).getDeadline().deadlineDate).toStrictEqual(moment('2021-08-07 02:45:00').toDate());
	});

	test('Regular case', () => {
		expect(new PDCalc('en', 'doc', 333, [22, 3], [5, 2], moment('2021-07-02 23:15:00').toDate()).getDeadline().deadlineDate).toStrictEqual(moment('2021-07-03 00:45:00').toDate());
	});

	test('Move to and exceed worktime', () => {
		expect(new PDCalc('en', 'doc', 1665, [22, 3], [5, 2], moment('2021-07-01 22:15:00').toDate()).getDeadline().deadlineDate).toStrictEqual(moment('2021-07-03 22:30:00').toDate());
	});
});
