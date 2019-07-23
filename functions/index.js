const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

exports.myFunction = functions.firestore.document('Mess/{uniqueId}/Deposit/{depositId}')
.onCreate((snap, context) => {

  console.log(snap.data().userUid);

	// if (context.params.deposiId && snap.data()) {
    const uid = snap.data().userUid;

		db
			.collection(`Users/${uid}/Device`)
			.listDocuments()
			.then((docRef) => {
				
				db
					.getAll(...docRef)
					.then((docs) => {

            console.log('Works');

						for (let documentSnapshot of docs) {
							if (documentSnapshot.exists) {
                console.log(documentSnapshot);
              
								sendNotifications(documentSnapshot.get('token'), snap.data.amount);
							} else {
								console.log(`Found missing document: ${documentSnapshot.id}`);
							}
						}
					})
					.catch((error) => console.log(error));
			})
			.catch((error) => console.log(error));
	// }
});

function sendNotifications(token, amount) {
	let message = {
		data: {
			"id": "130",
			"title": "Deposit " + amount,
			"body": "body"
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
