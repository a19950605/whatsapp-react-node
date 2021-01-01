import express from 'express';
import mongoose from 'mongoose';
import Messages from './dbMessages.js';
import Pusher from 'pusher';
import cors from 'cors';

const app = express();
const port = process.env.PORT || 9000;

const pusher = new Pusher({
	appId: '1131189',
	key: 'd65c3c04404aa6b48bfe',
	secret: 'afb1159be03643eb4938',
	cluster: 'ap1',
	useTLS: true,
});

app.use(express.json());
app.use(cors());

app.use((req, res, next) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Headers', '*');
	next();
});

const connection_url = '';

mongoose.connect(connection_url, {
	useCreateIndex: true,
	useNewUrlParser: true,
	useUnifiedTopology: true,
});

const db = mongoose.connection;

db.once('open', () => {
	console.log('DB connected');

	const msgCollection = db.collection('messagecontents');
	const changeStream = msgCollection.watch();

	changeStream.on('change', (change) => {
		console.log('a change occured', change);

		if (change.operationType === 'insert') {
			const messageDetails = change.fullDocument;

			pusher.trigger('messages', 'inserted', {
				name: messageDetails.name,
				message: messageDetails.message,
				timestamp: messageDetails.timestamp,
				received: messageDetails.received,
			});
		} else {
			console.log('Error triggering pusher');
		}
	});
});

app.get('/', (req, res) => res.status(200).send('hello world'));

app.get('/messages/sync', (req, res) => {
	Messages.find((err, data) => {
		if (err) {
			res.status(500).send(err);
		} else {
			res.status(200).send(data);
		}
	});
});

app.post('/messages/new', (req, res) => {
	const dbMessage = req.body;

	Messages.create(dbMessage, (err, data) => {
		if (err) {
			res.status(500).send(err);
		} else {
			res.status(201).send(data);
		}
	});
});

app.listen(port, () => console.log(`Listening on localhost:${port}`));
