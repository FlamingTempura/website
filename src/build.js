'use strict';

const fs = require('fs');
const path = require('path');
const bibtex = require('bibtex-parse');

let bibs = {};
['publications', 'other-writing', 'programming'].forEach(file => {
	const bib = fs.readFileSync(path.join(__dirname, `${file}.bib`), 'utf8');
	bibs[file] = bibtex.parse(bib).entries;
});

let html = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');

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

bibs['other-writing'].forEach(item => {
	let url = getUrl(item);
	let citation = [];

	if (url) {
		citation.push(`<a href="${url}">`);
	}
	citation.push(prop(item, 'title'));
	if (url) {
		citation.push(`</a>`);
	}
	citation.push(` (${prop(item, 'year')})`);
	
	if (prop(item, 'publisher')) {
		citation.push(`. <em>${prop(item, 'publisher')}</em>`);
	}
	
	let str = citation.join('');
	html = html.replace(/(<!--OTHER WRITING-->)/, `<li>${str}.</li>\n${indent}$1`);
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