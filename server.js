var fs = require('fs'),
    url = require('url');

var r = require('redis').createClient();

var fate = {};
fate.method = 'of decompression,of asphyxiation,of blood loss,of head loss,of haemorrhage,of vaporization'.split(',');
fate.adverb = 'horribly,quickly,slowly,painlessly,gloriously,honorably,quietly'.split(',');
fate.where = 'in the vacuum of space,in the canteen,in the parlor,on the bridge,in the airlock,in the barracks,at the bar,in the hold,on an invading ship,in their cabin'.split(',');
fate.cause = 'at the hand of $whom,by backstab courtesy of $whom,by their own undoing,to avenge $whom'.split(',');

var WHOM = 'no-one';

function DESTINY(victim) {
	var dead = roll(1) == 0;
	if (!dead)
		return [victim, ' will survive.'];

	var bits = ['adverb', 'method', 'cause', 'where'].map(destiny);
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
	if (what == 'whom')
		return [safe('<em>'), WHOM, safe('</em>')];
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
		resp.writeHead(200, headers);
		resp.write(preamble);
		if (!name.match(/^[\w '&;.\-~#]+$/))
			return resp.end('Bad name.');
		r.sadd('names', name, function (err) {
			if (err)
				return resp.end('Error');
			r.srandmember('names', function (err, whom) {
				if (err)
					return resp.end('Error');
				WHOM = whom;
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
