import pdCalc from './pdCalc'

describe('Constructor tests:', () => {
	test('Language error', () => {
		expect(() => new pdCalc('fr', 'doc', 1333)).toThrowError(
			'Unsupported language!'
		)
	})

	test('Symbol amount error', () => {
		expect(() => new pdCalc('en', 'doc', -2)).toThrowError(
			'Unacceptable amount of symbols!'
		)
	})
})

describe('Price tests:', () => {
	test('Minimal price: english', () => {
		expect(new pdCalc('en', 'doc', 10).getPrice()).toBe(12000)
	})

	test('Minimal price: russian', () => {
		expect(new pdCalc('ru', 'rtf', 5).getPrice()).toBe(5000)
	})

	test('Minimal price: ukrainian', () => {
		expect(new pdCalc('uk', 'what?', 1).getPrice()).toBe(5000)
	})

	test('Regular price', () => {
		expect(new pdCalc('en', 'doc', 2000).getPrice()).toBe(24000)
	})

	test('Taxed type price', () => {
		expect(new pdCalc('uk', 'html', 2000).getPrice()).toBe(12000)
	})
})
