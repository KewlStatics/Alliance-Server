'use strict';

Wisp.tourLadder = new sqlite3.Database('config/tourladder.db', () => {
	Wisp.tourLadder.run('CREATE TABLE IF NOT EXISTS tourladder (userid VARCHAR(18), elo FLOAT, wins INTEGER, losses INTEGER, ties INTEGER, tourwins INTEGER);');
});
let deleteLadderConfirm = false;

Wisp.updateTourLadder = function (p1, p2, result, room) {
	Wisp.tourLadder.all("SELECT * FROM tourladder WHERE userid = '" + p1.userid + "' OR userid = '" + p2.userid + "';", (err, users) => {
		if (err) return console.log(err);
		let p1entry = users.find(player => player.userid === p1.userid);
		let p2entry = users.find(player => player.userid === p2.userid);
		let p1elo = p1entry ? p1entry.elo : 1000, p2elo = p2entry ? p2entry.elo : 1000;

		//Messy Elo calcs, pretty much just ripped out of ladders.js
		let K1 = 50, K2 = 50;
		if (p1elo < 1200) {
			if (result === 'loss') {
				K1 = 10 + (p1elo - 1000) * 40 / 200;
			} else if (result === 'win') {
				K1 = 90 - (p1elo - 1000) * 40 / 200;
			}
		} else if (p1elo > 1350) {
			K1 = 40;
		} else if (p1elo > 1600) {
			K1 = 32;
		}

		if (p2elo < 1200) {
			if (result === 'win') {
				K2 = 10 + (p2elo - 1000) * 40 / 200;
			} else if (result === 'loss') {
				K2 = 90 - (p2elo - 1000) * 40 / 200;
			}
		} else if (p2elo > 1350) {
			K2 = 40;
		} else if (p2elo > 1600) {
			K2 = 32;
		}

		let E1 = 1 / (1 + Math.pow(10, (p2elo - p1elo) / 400));
		let E2 = 1 / (1 + Math.pow(10, (p1elo - p2elo) / 400));
		let score;
		switch (result) {
		case 'win':
			score = 1;
			break;
		case 'loss':
			score = 0;
			break;
		default:
			score = 0.5;
		}

		let newP1Elo = p1elo + K1 * (score - E1);
		let newP2Elo = p2elo + K2 * ((1 - score) - E2);
		if (newP1Elo < 1000) newP1Elo = 1000;
		if (newP2Elo < 1000) newP2Elo = 1000;

		let p1win = Math.floor(score);
		let p2win = Math.floor(1 - score);
		let tie = (result === 'draw' ? 1 : 0);

		let sql1 = "UPDATE tourladder SET elo = " + newP1Elo + ", wins = wins + " + p1win + ", losses = losses + " + p2win + ", ties = ties + " + tie + " WHERE userid = '" + p1.userid + "';";
		let sql2 = "UPDATE tourladder SET elo = " + newP2Elo + ", wins = wins + " + p2win + ", losses = losses + " + p1win + ", ties = ties + " + tie + " WHERE userid = '" + p2.userid + "';";
		if (!p1entry) sql1 = "INSERT INTO tourladder VALUES ('" + p1.userid + "', " + newP1Elo + ", " + p1win + ", " + p2win + ", " + tie + ", " + "0);";
		if (!p2entry) sql2 = "INSERT INTO tourladder VALUES ('" + p2.userid + "', " + newP2Elo + ", " + p2win + ", " + p1win + ", " + tie + ", " + "0);";

		Wisp.tourLadder.run(sql1, () => {
			Wisp.tourLadder.run(sql2, () => {
				let reasons = '' + (Math.round(newP1Elo) - Math.round(p1elo)) + ' for ' + (result === 'win' ? 'winning' : (result === 'loss' ? 'losing' : 'tying'));
				if (reasons.charAt(0) !== '-') reasons = '+' + reasons;
				room.addRaw('<br />' + Tools.escapeHTML(p1.name) + '\'s rating: ' + Math.round(p1elo) + ' &rarr; <strong>' + Math.round(newP1Elo) + '</strong><br />(' + reasons + ')');

				reasons = '' + (Math.round(newP2Elo) - Math.round(p2elo)) + ' for ' + (result === 'win' ? 'losing' : (result === 'loss' ? 'winning' : 'tying'));
				if (reasons.charAt(0) !== '-') reasons = '+' + reasons;
				room.addRaw(Tools.escapeHTML(p2.name) + '\'s rating: ' + Math.round(p2elo) + ' &rarr; <strong>' + Math.round(newP2Elo) + '</strong><br />(' + reasons + ')');

				room.update();
			});
		});
	});
};
Wisp.addTourWin = function (user) {
	Wisp.tourLadder.run("UPDATE tourladder SET tourwins = tourwins + 1 WHERE userid = '" + toId(user) + "';");
};

exports.commands = {
	tourelo: 'tourladder',
	tourladder: function (target, room, user) {
		if (!this.runBroadcast()) return;
		if (!target || !target.trim()) {
			Wisp.tourLadder.all("SELECT * FROM tourladder ORDER BY elo DESC;", (err, users) => {
				if (err) return console.log(err);
				if (!users.length) {
					this.sendReplyBox('No rated tournaments have been played yet.');
					room.update();
					return;
				}
				let table = '<center><b><u>Tournament Ladder</u></b><br>' +
					'<table border = "1" cellspacing = "0" cellpadding = "5"><tr><th>No.</th><th>User</th><th>Elo</th><th>Wins</th><th>Losses</th><th>Tour Wins</th>';
				for (let i = 0; i < (this.broadcasting && users.length > 10 ? 10 : users.length); i++) {
					if (!users[i] || users[i].elo <= 1000) break;
					let name = (Users.getExact(users[i].userid) ? Users.getExact(users[i].userid).name : users[i].userid);
					table += '<tr><td><center>' + (i + 1) + '</center></td><td style = "text-align: center">' + name + '</td><td style = "text-align: center">' + Math.round(users[i].elo) + '</td>' +
						'<td style = "text-align: center">' + users[i].wins + '</td><td style = "text-align: center">' + users[i].losses + '</td>' +
						'<td style = "text-align: center">' + users[i].tourwins + '</td></tr>';
				}
				table += '</table></center>';
				if (this.broadcasting && users.filter(player => player.elo > 1000).length > 10) table += '<center><button name = "send" value = "/tourladder" style = "margin-top: 2px"><small>Click to see the full ladder</small></button></center>';

				if (this.broadcasting) {
					this.sendReplyBox(table);
				} else {
					this.popupReply('|html|' + table);
				}
				room.update();
			});
			return;
		}
		target = (Users.getExact(target) ? Users.getExact(target).name : target);
		Wisp.tourLadder.all("SELECT elo FROM tourladder WHERE userid = '" + toId(target) + "';", (err, users) => {
			if (err) return console.log(err);
			if (!users.length) {
				this.sendReplyBox(target + ' has not played any rated tournaments yet.');
			} else {
				this.sendReplyBox(target + '\'s Tournament Elo is <b>' + Math.round(users[0].elo) + '</b>.');
			}
			room.update();
		});
	},

	tourladderers: 'tourladderusers',
	tourladdercount: 'tourladderusers',
	tourladderusers: function (target, room, user) {
		if (!this.runBroadcast()) return;
		Wisp.tourLadder.all("SELECT COUNT(*) FROM tourladder;", (err, count) => {
			if (err) return console.log(err);
			count = count[0]['COUNT(*)'];
			if (!count) {
				this.sendReplyBox('No rated tournaments have been played yet.');
			} else {
				this.sendReplyBox('<b>' + count + '</b> ' + (count === 1 ? 'user has' : 'users have') + ' participated in rated tournaments.');
			}
			room.update();
		});
	},

	deletetourladder: 'resettourladder',
	deletetourelo: 'resettourladder',
	resettourelo: 'resettourladder',
	resettourladder: function (target, room, user) {
		if (!this.can('hotpatch')) return false;
		Wisp.tourLadder.all("SELECT * FROM tourladder;", (err, users) => {
			if (err) return console.log(err);
			if (!users.length) return this.sendReply('No rated tournaments have been played yet.');
			if (!deleteLadderConfirm) {
				deleteLadderConfirm = true;
				return this.errorReply("WARNING: This will permanently delete all tournament ladder ratings, including all win/loss counts. If you're sure you want to do this, use this command again.");
			}

			Wisp.tourLadder.run("DELETE FROM tourladder;", () => {
				deleteLadderConfirm = false;
				Rooms('lobby').add('|html|<b>The Tournament Ladder has been reset.</b>').update();
				if (room.id !== 'lobby') this.sendReply('The Tournament Ladder has been reset.');
			});
		});
	},
};
