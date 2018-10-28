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

let html = fs.readFileSync(path.resolve(__dirname, 'template.html'), 'utf8');

const prop = (item, key) => {
	let val = (item.properties[key] || {}).value || '';
	if (key === 'author') {
		val = (val || '').split(' and ').map(name => {
			let [last, first] = name.split(', ');
			return `${first} ${last}`;
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
	
	let str = citation.join('');
	html = html.replace(/(<!--PUBLICATIONS-->)/, `<li>${str}.</li>\n${indent}$1`);
});

let months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
              'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];


bibs.blog.forEach(item => {
	item.date = new Date(prop(item, 'year'), months.indexOf(prop(item, 'month')), prop(item, 'day'));
});

// automatically generate bib entries for blogs
fs.readdirSync(path.resolve(__dirname, '../blog')).map(year => {
	fs.readdirSync(path.resolve(__dirname, `../blog/${year}`)).map(filename => {
		let post = fs.readFileSync(path.resolve(__dirname, `../blog/${year}/${filename}`), 'utf8');
		let date = new Date();
		let datematch = post.match(/\d+(st|nd|rd|th) \w+ \d\d\d\d \d\d:\d\d/);
		if (datematch) {
			date = moment(datematch[0], 'Do MMMM YYYY HH:mm').toDate();
		}
		let titlematch = post.match(/<h1>(.*)<\/h1>/);
		let publisherMatch = post.match(/<div class="publisher">(.*)<\/div>/);

		bibs.blog.push({
			date,
			properties: {
				url: { value: `/blog/${year}/${filename}` },
				title: { value: titlematch[1] },
				publisher: publisherMatch ? { value: publisherMatch[1] } : null
			}
		});
	});
});

bibs.blog.sort((a, b) => b.date - a.date).forEach(post => {
	let citation = [];


	citation.push(`${moment(post.date).format('D MMM YYYY')} - `);

	citation.push(`<a href="${prop(post, 'url')}">`);
	citation.push(prop(post, 'title'));
	citation.push(`</a>`);
	
	if (prop(post, 'publisher')) {
		citation.push(` <em>Posted to ${prop(post, 'publisher')}</em>`);
	}
	
	let str = citation.join('');
	html = html.replace(/(<!--BLOG-->)/, `<li>${str}.</li>\n${indent}$1`);
});


bibs.programming.forEach(item => {
	let citation = [];
	citation.push(`<a href="${getUrl(item)}">`);
	citation.push(prop(item, 'title'));
	citation.push(`</a>`);
	citation.push(` (${prop(item, 'year')})`);
	let str = citation.join('');
	html = html.replace(/(<!--PROGRAMMING-->)/, `<li>${str}.</li>\n${indent}$1`);
});

fs.writeFileSync(path.join(__dirname, '../index.html'), html, 'utf8');