const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

const notification = {};

notification.depositRequest = functions.firestore
	.document('Mess/{uniqueId}/Deposit/{depositId}')
	.onCreate((snap, context) => {
		const messId = context.params.uniqueId;

		return (
			//get admin uid
			db.runTransaction((tnx) => {
				return tnx.get(db.doc(`Mess/${context.params.uniqueId}`)).then((admin) => {
					let recipients = [ admin.get('adminUid') ];
					let depositAmount = snap.get('amount').toString();
					let depositor = snap.get('userUid');

					let notification = DepositRequestNotification(
						TYPE.DEPOSIT_REQUEST,
						recipients,
						depositor,
						depositAmount
					);

					getNotificationRef(messId).add(notification);
				});
			})
		);
	});

notification.depositRequestAccept = functions.firestore
	.document('Mess/{uniqueId}/Deposit/{depositId}')
	.onUpdate((change, context) => {
		const messId = context.params.uniqueId;

		if (change.after.get('approved')) {
			return db.runTransaction((tnx) => {
				return tnx.get(db.collection('Users').where('messId', '==', context.params.uniqueId)).then((users) => {
					let recipients = users.docs.map((user) => user.get('uid'));
					let depositAmount = change.after.get('amount').toString();
					let depositor = change.after.get('userUid');

					let notification = DepositRequestAcceptedNotification(
						TYPE.DEPOSIT_REQUEST_ACCEPTED,
						recipients,
						depositor,
						depositAmount
					);

					getNotificationRef(messId).add(notification);
				});
			});
		}
	});

notification.sendNotification = functions.firestore
	.document('Mess/{uniqueId}/Notifications/{notificationId}')
	.onCreate((snap, context) => {
		console.log('snap data: ', snap.data());
		let recipients = snap.get('recipients');
		let deviceCollectionList = recipients.map((uid) => db.collection(`Users/${uid}/Device`));

		deviceCollectionList.forEach((deviceColection) => {
			deviceColection.get().then((devices) => {
				devices.docs.forEach((device) => {
					sendNotifications(device.get('token'), snap.data());
				});
			});
		});
		return 0;
	});

const TYPE = {
	DEFAULT: 'DEFAULT',
	DEPOSIT_REQUEST: 'DEPOSIT_REQUEST',
	DEPOSIT_REQUEST_ACCEPTED: 'DEPOSIT_REQUEST_ACCEPTED'
};

function getNotificationRef(messId) {
	return db.collection(`Mess/${messId}/Notifications`);
}

function sendNotifications(token, data) {
	//delete array
	delete data.recipients;

	let message = {
		data: data,
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

//test
const NotificationBuilder = function() {
	var members = arguments;

	return function() {
		var obj = {},
			i = 0,
			j = members.length;
		for (; i < j; ++i) {
			obj[members[i]] = arguments[i];
		}

		return obj;
	};
};

const DepositRequestNotification = NotificationBuilder('type', 'recipients', 'depositor', 'depositAmount');
const DepositRequestAcceptedNotification = DepositRequestNotification;

module.exports = notification;
