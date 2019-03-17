
var util = require('util')
var originalLog = console.log
Date.prototype.getHMonth = function() { return this.getMonth() + 1 }
var fnames = { Y: 'getFullYear', M: 'getHMonth', D: 'getDate', h: 'getHours', m: 'getMinutes', s: 'getSeconds', }
Date.prototype.HFormat = function(f) {
	var d = this
	f = f.replace(/\%[a-zA-Z]/g, function(m) {
		var c = m.substr(1)
		var n = c in fnames ? d[fnames[c]]() : 0;
		return ('' + n).padStart(2, '0')
	})
	return f
}

console.log = function(...args) {
	var a = args.map(s => typeof(s) != 'string' ? s = util.inspect(s,{depth:null}) : s).join(', ')	
    originalLog(`[${new Date().HFormat("%Y-%M-%D %h-%m-%s")}] ${a}`)
}

var { TokenParser, SpaceToken, WordToken, SymbolToken  } = require('./TokenParser.js')
var { Lexer } = require('./Lexer.js')
var { Modules, ModuleCreator, Method } = require('./DocEntity.js')

var modules = new Modules
var coreModule = modules.getOrCreate('Core', () => ModuleCreator('Core'))
var requireMethod = coreModule.getOrCreate('require', () => new Method('require'))
console.log(modules)

/*
var tokens = TokenParser.process("local a = asd")
var lexstring = Lexer.makeLexString(tokens)
console.log(lexstring)
*/

var lexer = new Lexer
lexer.processString("local a = require('a',asd(a,a)),aaa(asd)")
console.log(lexer)
