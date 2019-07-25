const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

exports.depositRequest = functions.firestore
	.document('Mess/{uniqueId}/Deposit/{depositId}')
	.onCreate((snap, context) => {
		return (
			//get admin uid
			db.runTransaction((tnx) => {
				return (
					tnx
						.get(db.doc(`Mess/${context.params.uniqueId}`))
						.then((documentSnapshot) => {
							return documentSnapshot.get('adminUid');
						})
						//get admin devices reference
						.then((adminUid) => {
							return db.collection(`Users/${adminUid}/Device`).listDocuments();
						})
						//get admin devices doc
						.then((documnetReferences) => {
							return tnx.getAll(...documnetReferences);
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
			})
		);
	});

exports.depositRequestAccept = functions.firestore
	.document('Mess/{uniqueId}/Deposit/{depositId}')
	.onUpdate((change, context) => {
		if (change.after.get('approved')) {
			return db.runTransaction((tnx) => {
				return tnx.get(db.collection('Users').where('messId', '==', context.params.uniqueId)).then((users) => {
					users.forEach((user) => {
						user.ref.collection('Device').get().then((devices) => {
							devices.forEach((device) => {
                                sendNotifications(device.get('token'), "Accepted");
							});
						});
					});
				});
			});
		}
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
