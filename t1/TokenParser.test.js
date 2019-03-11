var { TokenParser, SpaceToken, WordToken  } = require('./TokenParser.js')

var t = (...a) => a.map(i => {
	var o = new i.class(i.startPosition)	
	Object.keys(i).forEach( k => { if(k !== 'class') o[k] = i[k] })
	return o
})

var objectName = (a) => (a.constructor && a.constructor.name) ? a.constructor.name : null
var deepCompare, arrayCompare, objectCompare

arrayCompare = (a, b) => {
	if(!Array.isArray(a) || !Array.isArray(b)) return false
	if(a.length != b.length) return false
	for(var i = 0, l = a.length; i < l; i++) {
		if(!deepCompare(a[i], b[i])) return false
	}
	return true
}

objectCompare = (a,b) => {
	if( !(a instanceof Object) || !(b instanceof Object) ) return false
	if( objectName(a) !== objectName(b) ) return false
	var checked = { }
	for(var name in a) {
		if(!deepCompare(a[name], b[name])) return false
		checked[name] = true
	}
	for(var name in b) {
		if(name in checked) continue
		if(!deepCompare(a[name], b[name])) return false
	}
	return true
}

deepCompare = (a, b) => {
	if(Array.isArray(a)) return arrayCompare(a, b)
	if(a instanceof Object) return objectCompare(a, b)
	return a === b
}

var tests = [

	{	result: [ {class: SpaceToken, startPosition: 0, endPosition: 2},
			{class: WordToken, startPosition: 3, endPosition: 5, word: 'asd'},
			{class: SpaceToken, startPosition: 6, endPosition: 7 } ],
		data: "   asd  ",
		name: "space and word" },

	{	result: [  ],
		data: "   asd(asd)  ",
		name: "asd123" }
]

for(var i = 0, l = tests.length; i < l; i++) {
	var test = tests[i]
	if( deepCompare(t(...test.result), TokenParser.process(test.data)) !== true) {
		console.log(`test '${test.name}' failed`)
		console.log('got result')
		console.log(TokenParser.process(test.data))
		console.log('needed')
		console.log(t(...test.result))
		return
	}
	console.log(` ${(''+(i + 1)).padStart(3, '0')} - ${test.name}`)
}
