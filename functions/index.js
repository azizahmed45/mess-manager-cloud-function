const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

exports.myFunction = functions.firestore.document('Mess/{uniqueId}/Deposit/{depositId}').onCreate((snap, context) => {
	return (
		//get admin uid
		db
			.doc(`Mess/${context.params.uniqueId}`)
			.get()
			.then((documentSnapshot) => {
				return documentSnapshot.get('adminUid');
			})
			//get admin devices reference
			.then((adminUid) => {
				return db.collection(`Users/${adminUid}/Device`).listDocuments();
			})
			//get admin devices doc
			.then((documnetReferences) => {
				return db.getAll(...documnetReferences);
			})
			//get admin devices
			.then((documentSnapshots) => {
				for (let documentSnapshot of documentSnapshots) {
					if (documentSnapshot.exists) {
						sendNotifications(documentSnapshot.get('token'), snap.data().amount);
					} else {
						console.log(`Found missing document: ${documentSnapshot.id}`);
					}
				}
			})
	);
});

function sendNotifications(token, amount) {
	let message = {
		data: {
			id: '130',
			title: 'Deposit ' + amount,
			body: 'body'
		},
		token: token
	};

	admin
		.messaging()
		.send(message)
		.then(() => {
			// Response is a message ID string.
			console.log('Successfully sent message:');
		})
		.catch(() => {
			console.log('Error sending message:');
		});
}
