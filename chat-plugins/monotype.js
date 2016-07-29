/*
* Plugin for an event hosted by the Monotype room.
*/

'use strict';

const database = new sqlite3.Database('config/monoladder.db', function () {
	database.run("CREATE TABLE if not exists users (userid TEXT, name TEXT, points)");
});

function readPoints(userid, callback) {
	if (!callback) return false;
	userid = toId(userid);
	database.all("SELECT points FROM users WHERE userid=$userid", {$userid: userid}, function (err, rows) {
		if (err) return console.log(err);
		callback(((rows[0] && rows[0].points) ? rows[0].points : 0));
	});
}

function writePoints(userid, amount, callback) {
	userid = toId(userid);
	database.all("SELECT * FROM users WHERE userid=$userid", {$userid: userid}, function (err, rows) {
		if (rows.length < 1) {
			database.run("INSERT INTO users(userid, points) VALUES ($userid, $amount)", {$userid: userid, $amount: amount}, function (err) {
				if (err) return console.log(err);
				if (callback) return callback();
			});
		} else {
			amount += rows[0].points;
			database.run("UPDATE users SET points=$amount WHERE userid=$userid", {$amount: amount, $userid: userid}, function (err) {
				if (err) return console.log(err);
				if (callback) return callback();
			});
		}
	});
}

Wisp.givePoints = function (userid, size, room) {
	if (size < 4 || !Config.monoladder) return;
	userid = toId(userid);
	let points = 0;
	if (size > 3 && size < 8) points = 1;
	if (size > 7 && size < 17) points = 3;
	if (size > 16 && size < 25) points = 5;
	if (size > 24 && size < 33) points = 9;
	if (size > 32 && size < 41) points = 15;
	if (size > 40) points = 25;
	writePoints(userid, points);
	room.add("|raw|<b>" + Wisp.nameColor(userid) + " has won <font color=#b30000>" + points + "</font>" + (points === 1 ? " point " : " points ") + "for the monoladder.</b>").update();
};

exports.commands = {
	points: function (target, room, user) {
		if (!this.runBroadcast()) return;
		let targetUser = (target ? target : user.name);
		readPoints(targetUser, points => {
			this.sendReplyBox(Wisp.nameColor(targetUser, true) + " has " + points + (points === 1 ? " monoladder point." : " monoladder points."));
		});
	},

	monopoints: 'monoladder',
	monoladder: function (target, room, user) {
		if (!target) target = 10;
		target = Number(target);
		if (isNaN(target)) target = 10;
		if (!this.runBroadcast()) return;
		if (this.broadcasting && target > 10) target = 10; // limit to 10 while broadcasting
		if (target > 500) target = 500;

		let self = this;

		function showResults(rows) {
			let output = '<table border="1" cellspacing ="0" cellpadding="3"><tr><th>Rank</th><th>Name</th><th>Points</th></tr>';
			let count = 1;
			for (let u in rows) {
				if (!rows[u].points || rows[u].points < 1) continue;
				let username;
				if (rows[u].name !== null) {
					username = rows[u].name;
				} else {
					username = rows[u].userid;
				}
				output += '<tr><td>' + count + '</td><td>' + Wisp.nameColor(username, true) + '</td><td>' + rows[u].points + '</td></tr>';
				count++;
			}
			self.sendReplyBox(output);
			room.update();
		}

		database.all("SELECT userid, points, name FROM users ORDER BY points DESC LIMIT $target;", {$target: target}, function (err, rows) {
			if (err) return console.log("monoladder: " + err);
			showResults(rows);
		});
	},
};
