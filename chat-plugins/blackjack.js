
'use strict';

const IP = "158.69.196.64";
const symbols = {
	'♥': 'H',
	'♦': 'D',
	'♣': 'S',
	'♠': 'C',
};

const deck = ['A♥', 'A♦', 'A♣', 'A♠', '2♥', '2♦', '2♣', '2♠', '3♥', '3♦', '3♣',
'3♠', '4♥', '4♦', '4♣', '4♠', '5♥', '5♦', '5♣', '5♠', '6♥', '6♦', '6♣', '6♠',
'7♥', '7♦', '7♣', '7♠', '8♥', '8♦', '8♣', '8♠', '9♥', '9♦', '9♣', '9♠', '10♥',
'10♦', '10♣', '10♠', 'J♥', 'J♦', 'J♣', 'J♠', 'Q♥', 'Q♦', 'Q♣', 'Q♠', 'K♥', 'K♦',
'K♣', 'K♠'];

class Blackjack {
	constructor(room) {
		this.room = room;
		this.players = {};
		this.ips = [];
		this.dealer = {cards: [], points: 0};
		this.deck = Tools.shuffle(deck.slice(0));
		this.id = Math.floor(Math.random() * 100000000);
		this.lastMessage = "";
		this.curUser = "";
	}
	start(timer) {
		if (Object.keys(this.players).length < 2) {
			if (timer) {
				clearTimeout(this.autostart);
				delete this.autostart;
				this.add("<br />Not enough users to start, autostart disabled.");
			}
			return "There's not enough players to start.";
		}

		this.curUser = Object.keys(this.players)[0];

		let output = 'The game of blackjack has started.<br />';
		this.started = true;
		for (let player in this.players) {
			this.giveCard(this.players[player].user.userid);
			this.giveCard(this.players[player].user.userid);
			output += Wisp.nameColor(this.players[player].user.userid, true) + ': [' + this.players[player].cards[0] + '] ' +
			'[' + this.players[player].cards[1] + '] (' + this.players[player].points + ')<br />';
		}

		this.giveCard('dealer');
		this.giveCard('dealer');
		output += "<b>Dealer:</b> [" + this.dealer.cards[0] + "]";

		this.add(output, true);
		this.next();
	}
	end(force, user) {
		if (force) {
			this.add("(Blackjack forcibly ended by " + Wisp.nameColor(user) + ")", true);
			if (this.curUser !== "") this.players[this.curUser].user.sendTo(this.room.id, '|uhtmlchange|user-bj-' + this.id + '|');
		}
		let winners = [];
		let prettyWinners = [];

		if (!force) {
			if (this.dealer.points > 21) {
				for (let u in this.players) {
					if (this.players[u].status === 'bust') continue;
					winners.push(this.players[u].user.userid);
				}
			} else if (this.dealer.points !== 21) {
				for (let u in this.players) {
					if (this.players[u].status === 'bust' || this.players[u].points <= this.dealer.points) continue;
					winners.push(this.players[u].user.userid);
				}
			}

			for (let u in winners) prettyWinners.push(Wisp.nameColor(winners[u], true));

			if (winners.length < 1) {
				this.add("<br />There's no winners this time.", false, true);
			} else {
				this.add("<br />Winners: " + prettyWinners.join(', '), false, true);
				if (this.room.id === 'marketplace') {
					if (winners.length < 2) {
						this.add("<br />Awarding 5 credits to " + winners[0] + ".", false, true);
						Wisp.writeCredits(winners[0], 5);
					} else {
						Wisp.writeCredits(winners[0], 2, () => {
							this.giveCredits(winners);
						});
					}
				}
			}
		}

		if (this.autostart) {
			clearTimeout(this.autostart);
			delete this.autostart;
		}
		delete Rooms(this.room.id).blackjack;
	}
	giveCredits(winners) {
		winners.splice(0, 1);
		if (winners[0]) {
			Wisp.writeCredits(winners[0], 2, () => {
				this.giveCredits(winners);
			});
		}
	}
	add(message, clean, add) {
		if (clean) this.lastMessage = "";
		this.room.send("|uhtmlchange|blackjack-" + this.id + "|");
		if (!add) this.room.send("|uhtml|blackjack-" + this.id + "|<div class=\"infobox\">" + this.lastMessage + message + "</div>");
		if (add) this.room.add("|uhtml|blackjack-" + this.id + "|<div class=\"infobox\">" + this.lastMessage + message + "</div>").update();
		this.lastMessage = this.lastMessage + message;
	}
	giveCard(user) {
		if (this.deck.length < 1) this.deck = Tools.shuffle(deck.slice(0));
		let card = toId(this.deck[0]).toUpperCase();
		let player = (user === 'dealer' ? this.dealer : this.players[user]);
		player.cards.push(this.deck[0]);
		this.deck.splice(0, 1);
		let points = 0;

		if (!isNaN(Number(card))) {
			points += Number(card);
		} else {
			switch (card) {
			case 'A':
				if ((player.points + 11) <= 21) {
					points += 11;
				} else {
					points += 1;
				}
				break;
			case 'J':
			case 'Q':
			case 'K':
				points += 10;
				break;
			}
		}
		player.points += points;
		if (player.cards.length < 3) return;
		if (player.cards.length > 2) this.add('<br />' + (user === 'dealer' ? 'The <b>Dealer</b>' : Wisp.nameColor(user, true)) + ' hit and received [' + player.cards[player.cards.length - 1] + ']');
		if (user === 'dealer') {
			if (player.points > 21) {
				let cards = '';
				for (let u in player.cards) cards += "[" + player.cards[u] + "] ";
				this.add('<br />The <b>Dealer</b> has bust with ' + cards + '(' + player.points + ')');
				this.end();
				return;
			}
			if (player.points === 21) {
				this.add('<br />The <b>Dealer</b> has blackjack!.');
				this.end();
				return;
			}
		}
		if (player.points > 21) {
			player.status = 'bust';
			let cards = '';
			for (let u in player.cards) cards += "[" + player.cards[u] + "] ";
			this.add('<br />' + Wisp.nameColor(user, true) + ' has bust with ' + cards + '(' + player.points + ')');
			player.user.sendTo(this.room.id, '|uhtmlchange|user-bj-' + this.id + '|');
		}
		if (player.points === 21) {
			player.status = 'stand';
			this.add('<br />' + Wisp.nameColor(user, true) + ' has blackjack!');
			player.user.sendTo(this.room.id, '|uhtmlchange|user-bj-' + this.id + '|');
		}
		if (user !== 'dealer') this.players[user].cards = player.cards;
		this.next();
	}
	next() {
		if (Object.keys(this.players)[Object.keys(this.players).length - 1] === this.curUser && this.players[this.curUser].status !== 'playing') {
			if (this.dealer.points < 17) {
				this.giveCard('dealer');
			} else if (this.dealer.points >= 17) {
				let cards = "";
				for (let u in this.dealer.cards) cards += "[" + this.dealer.cards[u] + "] ";
				this.add("<br />The <b>Dealer</b> stands with " + cards + "(" + this.dealer.points + ")");
				this.end();
			}
			return;
		}
		this.players[this.curUser].user.sendTo(this.room.id, '|uhtmlchange|user-bj-' + this.id + '|');
		if (this.players[this.curUser].status !== 'playing') {
			let number = 0;
			while (this.players[Object.keys(this.players)[number]].status !== 'playing') number++;
			this.curUser = Object.keys(this.players)[number];
		}
		let output = '|uhtml|user-bj-' + this.id + '|<div class="infobox">';
		output += "It's your turn to move<br />";
		for (let u in this.players[this.curUser].cards) {
			let card = this.players[this.curUser].cards[u];
			output += '<img src="http://' + IP + ':' + Config.port + '/cards/' + toId(card).toUpperCase() + symbols[card.substr(-1)] + '.png"';
			output += ' title="' + card + '" height="100">';
		}
		output += "<br />Score: " + this.players[this.curUser].points;
		output += '<br /><button name="send" value="/blackjack hit">Hit</button> <button name="send" value="/blackjack stand">Stand</button>';

		this.players[this.curUser].user.sendTo(this.room.id, "|c|~|" + this.players[this.curUser].user.name + ", it's your turn to move.");
		this.players[this.curUser].user.sendTo(this.room.id, output);
		this.timer = setTimeout(() => {
			clearTimeout(this.timer);
			delete this.timer;
			let cards = "";
			for (let u in this.players[this.curUser].cards) cards += "[" + this.players[this.curUser].cards[u] + "] ";
			this.players[this.curUser].status = 'stand';
			this.add("<br />" + Wisp.nameColor(this.curUser, true) + " stands with " + cards + "(" + this.players[this.curUser].points + ") (Auto-stand: took too long to move)");
			this.next();
		}, 60 * 1000);
	}
	join(user) {
		if (this.players[user.userid]) return "You have already joined this game.";
		for (let ip in user.ips) {
			if (this.ips.includes(ip)) return "Someone else with your IP has already joined this game.";
		}

		this.players[user.userid] = {cards: [], points: 0, status: 'playing', user: user};
		for (let ip in user.ips) this.ips.push(ip);
		this.add("<br />" + Wisp.nameColor(user.userid, true) + ' has joined the game of blackjack');
	}
	leave(user) {
		delete this.players[user];
		for (let ip in user.ips) {
			if (this.ips.includes(ip)) {
				this.ips.splice(this.ips.indexOf(ip), 1);
			}
		}
	}
}

exports.commands = {
	bj: 'blackjack',
	blackjack: {
		new: 'create',
		create: function (target, room, user) {
			if (!this.can('blackjack', null, room)) return false;
			if (room.blackjack) return this.errorReply("There's already a game of blackjack in this room.");

			room.blackjack = new Blackjack(room);

			if (target) target = parseFloat(target);
			if (isNaN(target) || target <= 0 || target > 0x7FFFFFFF) target = "";
			if (target !== "") {
				room.blackjack.autostart = setTimeout(() => room.blackjack.start(true), (target * 60000));
			}

			room.blackjack.add(
				Wisp.nameColor(user.userid, true) + ' has started a game of blackjack.<br />' +
				'<button name="send" value="/blackjack join">Join</button>' +
				(room.blackjack.autostart ? '<br />Game will automatically start in ' + target + ' ' + (target === 1 ? 'minute' : 'minutes') + '.' : ''), false, true
			);
		},

		start: function (target, room, user) {
			if (!room.blackjack) return this.errorReply("There's no game of blackjack in this room.");
			if (!this.can('blackjack', null, room)) return false;
			let reply = room.blackjack.start();
			if (reply) this.errorReply(reply);
		},

		end: function (target, room, user) {
			if (!room.blackjack) return this.errorReply("There's no game of blackjack in this room.");
			if (!this.can('blackjack', null, room)) return false;
			room.blackjack.end(true, user.userid);
		},

		hit: function (target, room, user) {
			if (!room.blackjack) return this.errorReply("There's no game of blackjack in this room.");
			if (!room.blackjack.started) return this.errorReply("This game hasn't started yet.");
			if (Users(room.blackjack.curUser) && Users(room.blackjack.curUser).userid !== user.userid) return this.errorReply("It's not your turn to move.");
			clearTimeout(room.blackjack.timer);
			delete room.blackjack.timer;
			room.blackjack.giveCard(user.userid);
		},

		stand: function (target, room, user) {
			if (!room.blackjack) return this.errorReply("There's no game of blackjack in this room.");
			if (!room.blackjack.started) return this.errorReply("This game hasn't started yet.");
			if (Users(room.blackjack.curUser) && Users(room.blackjack.curUser).userid !== user.userid) return this.errorReply("It's not your turn to move.");
			clearTimeout(room.blackjack.timer);
			delete room.blackjack.timer;
			let cards = "";
			for (let u in room.blackjack.players[user.userid].cards) cards += "[" + room.blackjack.players[user.userid].cards[u] + "] ";
			room.blackjack.players[user.userid].status = 'stand';
			room.blackjack.add("<br />" + Wisp.nameColor(user.userid, true) + " stands with " + cards + "(" + room.blackjack.players[user.userid].points + ")");
			room.blackjack.next();
		},

		j: 'join',
		join: function (target, room, user) {
			if (!room.blackjack) return this.errorReply("There's no game of blackjack in this room.");
			if (room.blackjack.started) return this.errorReply("This game of blackjack has already started.");
			if (!this.canTalk()) return this.errorReply("You can't join blackjack while unable to talk.");
			let reply = room.blackjack.join(user);
			if (reply) this.sendReply(reply);
		},

		l: 'leave',
		leave: function (target, room, user) {
			if (!room.blackjack) return this.errorReply("There's no game of blackjack in this room.");
			if (!room.blackjack.players[user.userid]) return this.errorReply("You haven't joined this game of blackjack.");
			if (room.blackjack.players[room.blackjack.curUser] && room.blackjack.players[room.blackjack.curUser].user.userid === user.userid) return this.parse("/blackjack stand");
			room.blackjack.leave(user);
			room.blackjack.add("<br />" + Wisp.nameColor(user.userid, true) + " has left the game of blackjack.");
			this.sendReply("You've left this game of blackjack");
		},

		'': 'help',
		help: function (target, room, user) {
			if (!this.runBroadcast()) return;
			this.sendReplyBox(
				"Blackjack Commands:<br />" +
				"/blackjack create [minutes (optional)] - Creates a game of blackjack. If minutes is specified, the game will automatically.<br />" +
				"/blackjack start - Starts a game of blackjack.<br />" +
				"/blackjack end - Forcibly ends a game of blackjack.<br />" +
				"/blackjack join - Joins a game of blackjack.<br />" +
				"/blackjack leave - Leaves a game of blackjack.<br />" +
				"/blackjack hit<br />" +
				"/blackjack stand"
			);
		},
	},
	blackjackhelp: function () {
		this.parse("/blackjack help");
	},
};