import express from 'express';
import config from 'config';

import calculator from './routes/pricedeadline';

const app = express();
const PORT = process.env.PORT || config.get('server.PORT');

app.use((<any>express).json({ extended: true }));
app.use('/calculator', calculator);
const start = async () => {
	try {
		app.listen(PORT, () => {
			console.log(`Server has been started at port ${PORT}.\n`);
		});
	} catch (e) {
		console.log(e);
	}
};

start();
