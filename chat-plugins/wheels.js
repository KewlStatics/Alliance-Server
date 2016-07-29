'use strict';

class Wheel {
	constructor(wheelmulti, wheelHost, wheel, wheelValue) {
		this.wheelMulti = wheelmulti;
		this.wheelHost = wheelHost;
		this.wheel = wheel;
		this.wheelValue = wheelValue;
	}
	initDisplay(target) {
		return '|raw|<div style=" padding: 5px, 0px; background-color: #FFFFCC; border: #DEA431, solid 1px; background-size: 100%; color: #DEA431;' +
			'font-size: 12px; text-align: center;">The Wheel Of<br><font style="color: #DEA431;"><em><strong>' + target.split(',')[0].toUpperCase() +
			'</strong></em></font><br>Has been started and is waiting to be spun for the maximum amount of ' + this.wheel[this.wheel.length - 1] * this.wheelMulti +
			(this.wheel[this.wheel.length - 1] * this.wheelMulti === 1 ? ' buck' : ' bucks') + '!<hr style="border: solid, 0.5px, #DEA431">The Mulitiplier is:' +
			'<em><strong><font style="color: #DEA431;">' + this.wheelMulti + '</font></em></strong><hr style="border: solid, 0.5px, #DEA431"><b>' +
			'<font style="color: #FFC400;">' + this.wheel + '</b></font><hr style="border: solid, 0.5px, #DEA431;"><button style="border: double,' +
			' #DEA431, 4px; color: #DEA431; background-color: #FFFFCC; border-radius: 10px; font-face: serif ; font-size: 12px;" name="send" value="/wheel spin">Spin The Wheel! </button></div>';
	}
	endDisplay(winner, winnings) {
		return '|raw|<div style="padding: 5px; background-color: #FFFFCC; color: #DEA431; border: solid, 1px, #DEA431; font-size: 15px;">The wheel ' +
		'has landed on: <em><strong>' + this.wheelValue + '</strong></em><br />Negative Numbers = Spinner Wins<br />Positive Numbers = Host Wins<br /></font>' +
		Wisp.nameColor(winner, true) + ' has won ' + winnings + '</div>';
	}
}

const wheels = {
	scrubs: [-5, -4, -3, -2, -2, -1, -1, -1, -1, -1, -1, +1, +1, +3, +3, +3, +3, +3, +3, +5],
	wealth: [-100, -50, -50, -50, -50, -25, -25, -25, +50, +50, +75, +100, +150],
	demise: [-10, -8, -4, -2, -2, -2, +1, +2, +5, +6, +9, +10],
	arrogance: [-20, -10, -10, -5, -5, -1, -1, +2, +15, +20, +25],
};

function spinWheel(wheel) {
	return wheel[Math.floor(Math.random() * wheel.length)];
}

function isMoney(money) {
	let numMoney = Number(money);
	if (isNaN(money)) return "Must be a number.";
	if (String(money).includes('.')) return "Cannot contain a decimal.";
	if (numMoney < 1) return "Cannot be less than one buck.";
	return numMoney;
}

function checkMoney(money) {
	let check = true;
	let numMoney = Number(money);
	if (isNaN(numMoney)) check = false;
	if (String(money).includes('.')) check = false;
	if (numMoney < 1) check = false;
	return check;
}

exports.commands = {
	wheel: {
		create: function (target, room, user) {
			if (room.id !== 'casino' && room.id !== 'coldfrontcasino') return this.errorReply("This game may not be played outside of a casino.");
			if (!target || target.indexOf(',') < 0) return this.parse('/wheel help');
			let targets = target.split(",");
			if (room.wheel) return this.errorReply('There is already a wheel active in this room.');
			if (!targets[1]) return this.parse('/wheel help');
			if (!wheels[toId(targets[0])]) return this.errorReply('The wheel specifed does not exist.');
			Economy.readMoney(user.userid, money => {
				if (money < wheels[targets[0]][wheels[targets[0]].length - 1] * Number(targets[1])) return this.errorReply('You do not have enough bucks to create this game.');
				if (!checkMoney(targets[1])) return this.errorReply('Multipliers ' + isMoney(targets[1]) + '.');
				room.wheel = new Wheel(parseInt(targets[1]), user.userid, wheels[targets[0]], spinWheel(wheels[targets[0]]));
				room.add(room.wheel.initDisplay(target)); //make look fancy later
				room.add('|raw|<b><font color="orange">' + Wisp.nameColor(user, true) + ' is hosting the wheel.</font></b>');
				room.update();
				Economy.writeMoney(user.userid, (room.wheel.wheel[room.wheel.wheel.length - 1] * room.wheel.wheelMulti) * -1);
			});
		},
		start: 'join',
		spin: 'join',
		join: function (target, room, user) {
			if (!room.wheel) return this.errorReply('There is no wheel to spin.');
			if (room.wheel.joined) return this.errorReply("Someone else joined this wheel.");
			if (user.userid === room.wheel.wheelHost) return this.errorReply('You cannot join a game you are hosting.');
			Economy.readMoney(user.userid, money => {
				if (room.wheel.wheel[room.wheel.wheel.length - 1] * room.wheel.wheelMulti > money) return this.errorReply('You do not have enough bucks to spin this wheel');
				room.wheel.joined = true;
				Economy.writeMoney(user.userid, (room.wheel.wheel[room.wheel.wheel.length - 1] * room.wheel.wheelMulti) * -1, function () {
					room.add('|raw|<b><font color="orange">' + Wisp.nameColor(user, true) + ' has spun the wheel.</font></b>');
					let winnings = room.wheel.wheelValue;
					if (winnings > 0) winnings = room.wheel.wheelValue * room.wheel.wheelMulti;
					if (winnings < 0) winnings = (room.wheel.wheelValue * -1) * room.wheel.wheelMulti;

					room.add(room.wheel.endDisplay((room.wheel.wheelValue > 0 ? room.wheel.wheelHost : user.userid), winnings));
					room.update();

					let hostPayout = room.wheel.wheel[room.wheel.wheel.length - 1] * room.wheel.wheelMulti;
					let playerPayout = room.wheel.wheel[room.wheel.wheel.length - 1] * room.wheel.wheelMulti;

					if (room.wheel.wheelValue < 0) {
						playerPayout += (room.wheel.wheelValue * -1) * room.wheel.wheelMulti;
						hostPayout = hostPayout - ((room.wheel.wheelValue * -1) * room.wheel.wheelMulti);
					}
					if (room.wheel.wheelValue > 0) {
						hostPayout += room.wheel.wheelValue * room.wheel.wheelMulti;
						playerPayout = playerPayout - (room.wheel.wheelValue * room.wheel.wheelMulti);
					}

					Economy.writeMoney(room.wheel.wheelHost, hostPayout, function () {
						Economy.writeMoney(user.userid, playerPayout, function () {
							delete room.wheel;
						});
					});
				});
			});
		},
		end: function (target, room, user) {
			if (!room.wheel) return this.errorReply('There is no wheel to end.');
			if (!this.canTalk()) return this.errorReply("You may not end the wheel while unable to speak.");
			if (user.userid !== room.wheel.wheelHost && !this.can('broadcast', null, room)) return this.errorReply('Access Denied');
			Economy.writeMoney(room.wheel.wheelHost, Math.abs(room.wheel.wheel[room.wheel.wheel.length - 1]) * room.wheel.wheelMulti);
			delete room.wheel;
			room.add('|raw|<font color="orange">The WOM was ended by <b>' + Wisp.nameColor(user, true) + '</b>.</font>'); //html needed
		},
		help: function (target, room, user) {
			if (!this.runBroadcast()) return;
			this.sendReplyBox('<center>Wheels of Misfortune Commands- Created by Bandi and jd </center><hr />' +
			'More detailed WOM documentation <a href="http://pastebin.com/fKExymMZ">here</a><br />' +
			'/wheel list - Shows the list of wheels with their names and numbers<br />' +
			'/wheel create [wheelname], [multiplier] - Starts a wheel game Hint: don\'t put "Wheel of" in the wheelname<br />' +
			'/wheel join/spin/start - Joins the wheel game. <br />' +
			'/wheel end - Ends the current wheel game <br />');
		},
		list: function (target, room, user) {
			if (!this.runBroadcast()) return;
			this.sendReplyBox('<center>Wheels of Misfortune :]</center><hr />' +
			'Wheel of Scrubs: -5, -4, -3, -2, -2, -1, -1, -1, -1, -1, -1, +1, +1, +3, +3, +3, +3, +3, +3, +5 Made by Bandi for the scrub jd<br />' +
			'Wheel of Wealth: -200, -100, -100, -50, -50, -25, -25, -25, +50, +200, +200, +300, +300, +400 Made by Emelio<br />' +
			'Wheel of Arrogance -20, -10, -10, -5, -5, -1, -1, +2, +15, +20, +25 Made by Bandi<br />' +
			'Wheel of Demise -10, -8, -4, -2, -2, -2, +1, +2, +5, +6, +9, +10 Made by IcyDemise<br />' +
			'To make a wheel PM Bandi, :].');
		},
	},
};
