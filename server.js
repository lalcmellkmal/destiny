var fs = require('fs'),
    url = require('url');

var r = require('redis').createClient();

var fate = {};
fate.adverb = 'horribly,quickly,slowly,painlessly,gloriously,honorably,quietly,transcendentally,nobly,mercilessly,lewdly'.split(',');
fate.method = 'of decompression,of asphyxiation,of blood loss,of head loss,of haemorrhage,of vaporization,of shock,of incineration,of hypothermia,of stab wound,of blunt trauma,of crushing,of penetration,of impalement,of disembowelment,of electrocution,of infection,of poisoning'.split(',');
fate.cause = 'at the hand of $enemy,by $plot courtesy of $enemy,by their own undoing,to avenge $enemy,from horseplay,by order of $enemy'.split(',');
fate.plot = "backstab,facestab,gank,ritual,firearm".split(',');
fate.where = "in the $casual,in the $classy,in the $ops,$inspace,$incabin".split(',');
fate.casual = "canteen,closet,freezer room,meat locker".split(',');
fate.classy = "ballroom,wine cellar,parlor".split(',');
fate.ops = "engine room,lookout,barracks,hold,airlock".split(',');
fate.inspace = "in the vacuum of space,on an invading ship,in the cosmic ocean,on an asteroid,in hyperspace,on an allied ship,in an escape pod,on the bridge,at the bar".split(',');
fate.incabin = "in their cabin,in $friend's cabin,in $enemy's cabin".split(',');
fate.activity = 'while trying to $assist $friend,while $assisting $friend,while failing to $assist $friend,after $assisting $friend'.split(',');
fate.assist = '$assistmisc,protect,save,hold on to,find,make their peace with,backstab,rape,be $lewd with,be very $lewd with'.split(',');
fate.assisting = '$assistingmisc,protecting,saving,holding on to,finding,making their peace with,backstabbing,raping,being $lewd with,being very $lewd with'.split(',');
fate.assistmisc = 'negotiate with,recruit,establish contact with,mug'.split(',');
fate.assistingmisc = 'negotiating with,recruiting,establishing contact with,mugging'.split(',');
fate.lewd = 'lewd,hot and heavy,tsundere,yandere,flirty,incestual,tender and loving,awkward,shy,consensual,non-consensual,innocent,downright dirty,disingenuous'.split(',');

var CAST;

function DESTINY(victim) {
	var dead = roll(1) == 0;
	if (!dead)
		return [victim, ' will survive.'];

	var bits = [];
	if (roll(3) == 1)
		bits.push('adverb');
	bits.push('method', 'cause');
	if (flip())
		bits.push('activity');
	bits.push('where');
	bits = bits.map(destiny);
	bits.unshift(victim, 'will die');

	var red = roll(bits.length);
	bits[red] = [safe('<strong>'), bits[red], safe('</strong>')];

	var out = [];
	bits.forEach(function (bit) {
		out.push(bit, ' ');
	});
	out.pop();
	out.push('.');
	return out;
}

function destiny(what) {
	if (['enemy', 'friend'].indexOf(what) >= 0)
		return [safe('<em>'), CAST[what], safe('</em>')];
	var kakera = randomOf(fate[what]).split(/\$(\w+)/g);
	for (var i = 0; i < kakera.length; i++) {
		if (i % 2)
			kakera[i] = destiny(kakera[i]);
	}
	return kakera;
}

function roll(sides) {
	return Math.floor(Math.random() * sides);
}
function flip() {
	return roll(2) == 1;
}
function randomOf(list) {
	return list[roll(list.length)];
}

require('http').createServer(function (req, resp) {
	var u = url.parse(req.url, true)
	if (u.pathname != '/') {
		resp.writeHead(404);
		resp.end('Not found ;_;');
		return;
	}
	var name = u.query.name;
	if (name) {
		name = name.trim().replace(/\s\s+/g, ' ');
		resp.writeHead(200, headers);
		resp.write(preamble);
		var uniq = name.toLowerCase().replace(/[^a-z]+/g, '');
		if (!name.match(/^[\w '&;.\-~#]{1,30}$/) || !uniq)
			return resp.end('Bad name.');
		r.hincrby('nameuses', uniq, 1, function (err, n) {
			if (err)
				return resp.end('Error');
			var m = r.multi();
			m.srandmember('names');
			m.srandmember('names');
			if (n == 3)
				m.sadd('names', name);
			m.exec(function (err, rs) {
				if (err) {
					r.hincrby('nameuses', uniq, -1);
					return resp.end('Error');
				}
				CAST = {enemy: rs[0], friend: rs[1]};
				if (!CAST.enemy && !CAST.friend)
					CAST.enemy = CAST.friend = name;
				var dest = DESTINY(name);
				resp.end(flatten(dest));
			});
		});
	}
	else {
		resp.writeHead(200, headers);
		resp.end(introduce);
	}
}).listen(8000);

var headers = {'Content-Type': 'text/html; charset=UTF-8'};
var introduce = fs.readFileSync('intro.html', 'UTF-8');
var preamble = fs.readFileSync('head.html', 'UTF-8');

function safe(input) {
	return {safe: input};
}

function flatten(input) {
	if (!input)
		return '';
	if (input instanceof Array)
		return input.map(flatten).join('');
	if (typeof input == 'object' && input.safe)
		return input.safe;
	return escapeHtml(input);
}

var entities = {'&' : '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'};
function escapeHtml(html) {
	return html.replace(/[&<>"]/g, function (c) { return entities[c]; });
}
