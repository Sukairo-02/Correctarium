import { RequestHandler } from 'express';
import PDCalc from './utility/PDCalc';

type reqType = {
	language: string;
	mimetype: string;
	count: number;
};

type corDline = {
	time: string;
	deadline: number;
	deadlineDate: Date;
};

class PDCalculator {
	public calculate: RequestHandler = (req, res) => {
		try {
			const reqData: reqType = (<any>req).body;
			const { language, mimetype, count } = reqData;
			let price: number;
			let deadline: corDline;
			try {
				const pdc = new PDCalc(language, mimetype, count);
				price = pdc.getPrice();
				deadline = pdc.getDeadline();
			} catch (er) {
				console.log(er);
				return res.status(403).json({ er });
			}

			return res.json({
				price,
				time: deadline.time,
				deadline: deadline.deadline,
				deadlineDate: deadline.deadlineDate,
			});
		} catch (e) {
			console.log(e);
			return res.status(501).json({
				msg: 'Error occured while processing data. Please, try again later.',
			});
		}
	};
}

export = new PDCalculator();
