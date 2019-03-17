var { TokenParser, SpaceToken, WordToken, SymbolToken, StringToken  } = require('./TokenParser.js')
var { objectName, deepCompare, arrayCompare, objectCompare } = require('./testutils.js')

var t = (...a) => a.map(i => {
	var o = new i.class(i.startPosition)	
	Object.keys(i).forEach( k => { if(k !== 'class') o[k] = i[k] })
	return o
})

var tests = [

	{	result: [ {class: SpaceToken, startPosition: 0, endPosition: 2},
			{class: WordToken, startPosition: 3, endPosition: 5, word: 'asd'},
			{class: SpaceToken, startPosition: 6, endPosition: 7 } ],
		data: "   asd  ",
		name: "space and word" },

	{	result: [  { class: SpaceToken, startPosition: 0, endPosition: 2 },
			{ class: WordToken, startPosition: 3, endPosition: 5, word: 'asd' },
			{ class: SymbolToken, startPosition: 6, endPosition: 6, symbol: '(' },
			{ class: WordToken, startPosition: 7, endPosition: 9, word: 'asd' },
			{ class: SymbolToken, startPosition: 10, endPosition: 10, symbol: ')' },
			{ class: SpaceToken, startPosition: 11, endPosition: 12 } ],
		data: "   asd(asd)  ",
		name: "symbols" },

	{	result: [ { class: WordToken, startPosition: 0, endPosition: 4, word: 'local', isOperator: true },
			{ class: SpaceToken, startPosition: 5, endPosition: 5 },
			{ class: WordToken, startPosition: 6, endPosition: 6, word: 'a' },
			{ class: SpaceToken, startPosition: 7, endPosition: 7 },
			{ class: SymbolToken, startPosition: 8, endPosition: 8, symbol: '=' },
			{ class: SpaceToken, startPosition: 9, endPosition: 9 },
			{ class: WordToken, startPosition: 10, endPosition: 16, word: 'requier' },
			{ class: SymbolToken, startPosition: 17, endPosition: 17, symbol: '(' },
			{ class: StringToken, startPosition: 18, quote: '\'', endPosition: 21, symbol: 'asd' },
			{ class: SymbolToken, startPosition: 23, endPosition: 23, symbol: ')' } ],
	data: "local a = requier('asd')",
	name: "string" },
		
	{	result: [ { class: SymbolToken, startPosition: 0, endPosition: 0, symbol: '=' },
			{ class: SpaceToken, startPosition: 1, endPosition: 1 },
			{ class: SymbolToken, startPosition: 2, endPosition: 3, symbol: '==' } ],
	data: "= ==",
	name: "==" }

]

for(var i = 0, l = tests.length; i < l; i++) {
	var test = tests[i]
	if( deepCompare(t(...test.result), TokenParser.process(test.data)) !== true) {
		console.log(`test '${test.name}' failed`)
		console.log('got result')
		console.log(TokenParser.process(test.data))
		console.log('needed')
		console.log(t(...test.result))
		process.exit()
	}
	console.log(` ${(''+(i + 1)).padStart(3, '0')} - ${test.name}`)
}
