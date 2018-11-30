'use strict';

const fs = require('fs');
const path = require('path');
const bibtex = require('bibtex-parse');
const moment = require('moment');

let bibs = {};
['publications', 'blog', 'programming'].forEach(file => {
	const bib = fs.readFileSync(path.resolve(__dirname, `${file}.bib`), 'utf8');
	bibs[file] = bibtex.parse(bib).entries;
});

let home = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8')
	.replace(/(<!--PUBLICATIONS-->).*(<!--PUBLICATIONS END-->)/s, '$1$2')
	.replace(/(<!--BLOG-->).*(<!--BLOG END-->)/s, '$1$2')
	.replace(/(<!--PROGRAMMING-->).*(<!--PROGRAMMING END-->)/s, '$1$2');


let blog = fs.readFileSync(path.resolve(__dirname, '../blog/index.html'), 'utf8')
	.replace(/(<!--BLOG-->).*(<!--BLOG END-->)/s, '$1$2');

const prop = (item, key) => {
	let val = (item.properties[key] || {}).value || '';
	if (key === 'author') {
		val = (val || '').split(' and ').map(name => {
			let [last, first] = name.split(', ');
			return `${first || ''} ${last}`;
		}).join(', ');
	}
	val = String(val).replace('--', '&mdash;');
	return val;
};

const getUrl = item => {
	let url = prop(item, 'url');
	if (url) { return url; }
	let doi = prop(item, 'doi');
	if (doi) { return `http://dx.doi.org/${doi}`; }
	return '';
};

let indent = '\t\t\t\t';

bibs.publications.forEach(item => {
	let url = getUrl(item);
	let citation = [];

	citation.push(prop(item, 'author'));
	citation.push(` (${prop(item, 'year')}). `);
	if (url) {
		citation.push(`<a href="${url}">`);
	}
	citation.push(prop(item, 'title'));
	if (url) {
		citation.push(`</a>`);
	}
	if (item.type === 'inproceedings' || item.type === 'talk') {
		citation.push(` at ${prop(item, 'booktitle')} in ${prop(item, 'location')} on ${prop(item, 'on')}`);
	}
	if (item.type === 'article') {
		citation.push(` in <em>${prop(item, 'journal')}</em>`);
	}
	if (item.type === 'publisher') {
		citation.push(`. <em>${prop(item, 'publisher')}</em>`);
	}
	if (prop(item, 'manuscript')) {
		citation.push(` [<a href="${prop(item, 'manuscript')}">Manuscript</a>]`);
	}
	if (prop(item, 'slides')) {
		citation.push(` [<a href="${prop(item, 'slides')}">Slides</a>]`);
	}
	if (prop(item, 'poster')) {
		citation.push(` [<a href="${prop(item, 'poster')}">Poster</a>]`);
	}
	
	let str = citation.join('');
	home = home.replace(/(<!--PUBLICATIONS END-->)/, `<li>${str}.</li>\n${indent}$1`);
});

let months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
              'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

bibs.blog.forEach(item => {
	item.date = new Date(prop(item, 'year'), months.indexOf(prop(item, 'month')), prop(item, 'day'));
});

// automatically generate bib entries for blogs
fs.readdirSync(path.resolve(__dirname, '../blog')).map(year => {
	let dir = path.resolve(__dirname, `../blog/${year}`);
	if (!fs.statSync(dir).isDirectory()) { return; }
	fs.readdirSync(dir).map(filename => {
		let post = fs.readFileSync(path.resolve(dir, filename), 'utf8'),
			date = new Date(),
			datematch = post.match(/\d+(st|nd|rd|th) \w+ \d\d\d\d \d\d:\d\d/);
		if (datematch) {
			date = moment(datematch[0], 'Do MMMM YYYY HH:mm').toDate();
		}
		let titlematch = post.match(/<h1>(.*)<\/h1>/),
			publisherMatch = post.match(/<div class="publisher">(.*)<\/div>/),
			picMatch = post.match(/<img [^>]*src="([^"]*)"/),
			introMatch = post.match(/<p>(.*)<\/p>/);

		bibs.blog.push({
			date,
			properties: {
				url: { value: `/blog/${year}/${filename}` },
				title: { value: titlematch[1] },
				publisher: publisherMatch ? { value: publisherMatch[1] } : null,
				pic: picMatch ? { value: picMatch[1] } : null,
				intro: introMatch ? { value: introMatch[1] } : null
			}
		});
	});
});

let sortedBlog = bibs.blog.sort((a, b) => b.date - a.date);

sortedBlog.slice(0, 9).forEach((post, i) => {
	if (i === 8) {
		post = bibs.blog.find(p => prop(p, 'url') === '/blog/2014/virtual-personal-assistants.html');
	}
	let citation = [];
	
	citation.push(`<a href="${prop(post, 'url')}">`);
	citation.push(`<img src="${prop(post, 'pic')}">`);
	citation.push(`<div class="title">${prop(post, 'title')}</div>`);
	citation.push(`<div class="meta">`);
	if (prop(post, 'publisher')) {
		citation.push(`Posted to ${prop(post, 'publisher')} &bullet; `);
	}
	citation.push(moment(post.date).format('D MMM YYYY'));
	citation.push(`</div>`);
	citation.push(`</a>`);

	
	let str = citation.join('');
	home = home.replace(/(<!--BLOG END-->)/, `<li>${str}</li>\n${indent}$1`);
});

bibs.programming.forEach(item => {
	let citation = [];
	citation.push(`<a href="${getUrl(item)}">`);
	citation.push(prop(item, 'title'));
	citation.push(`</a>`);
	citation.push(` (${prop(item, 'year')})`);
	let str = citation.join('');
	home = home.replace(/(<!--PROGRAMMING END-->)/, `<li>${str}.</li>\n${indent}$1`);
});

fs.writeFileSync(path.join(__dirname, '../index.html'), home, 'utf8');


sortedBlog.forEach(post => {
	let citation = [];

	citation.push(`<h3 class="title"><a href="${prop(post, 'url')}">`);
	citation.push(prop(post, 'title'));
	citation.push(`</a></h3>`);

	citation.push(`<div class="meta">`);
	citation.push(moment(post.date).format('D MMM YYYY'));
	
	if (prop(post, 'publisher')) {
		citation.push(` &bullet; Posted to ${prop(post, 'publisher')}`);
	}

	citation.push('</div>');

	if (prop(post, 'pic')) {
		citation.push(`<img src="${prop(post, 'pic')}">`);
	}

	if (prop(post, 'intro')) {
		citation.push(`<p>${prop(post, 'intro')}</p>`);
		citation.push(`<a class="readmore" href="${prop(post, 'url')}">Read more</a>`);
	}
	
	let str = citation.join('');
	blog = blog.replace(/(<!--BLOG END-->)/, `<li>${str}</li>\n${indent}$1`);
});


fs.writeFileSync(path.join(__dirname, '../blog/index.html'), blog, 'utf8');