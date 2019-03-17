var { TokenParser, SpaceToken, WordToken, SymbolToken, StringToken  } = require('./TokenParser.js')
var { DocEntity } = require('./DocEntity.js')

class LexToken {
	constructor() {

	}
}

class LexChain extends LexToken {
	constructor(token) {
		super()
		this.tokens = [ token ]
	}
}

LexChain.isStartToken = (token) => {
	if(token instanceof WordToken && !token.isOperator) {
		// check for valid documentation entry
		var docEntity = Lexer.lexer.getDocEntity('Core', token.word)
		if(docEntity) return true
		docEntity = Lexer.lexer.getVariable(token.word)
		if(docEntity) return true
	}
	return false
}

class LexString extends LexToken {
	constructor(tokens, position) {
		super()
		position = position || 0

		// 1. isolate () -> LexBlock
		var processedList = [ ]
		for(var i = position, l = tokens.length; i < l; i++) {
			var token = tokens[i]
			if(token.symbol == '(') {
				var s = new LexString(tokens, i + 1)
				i = s.endPosition - 1
				delete s.endPosition
				s.isBlock = true
				processedList.push(s)				
			}
			else if(token.symbol == ')') {
				i ++
				break
			}
			else {
				processedList.push(token)
			}
		}
		this.endPosition = i

		tokens = this.tokens = processedList
		processedList = [ ]

		// 2. isolate chains
		var chain = null
		for(var i = 0, l = tokens.length; i < l; i++) {
			var token = tokens[i]
			if(chain) {

			}
			else if(chain.isStartToken(token)) {
				chain = new LexChain(token)
				tokens.push(token)
			}
			else {
				tokens.push(token)
			}
		}

		this.tokens = processedList
	}
}

class Lexer {

	constructor() {
		this.strings = [ ]

	}

	getDocEntity(module, name) {

		return null
	}

	getVariable(name) {
		return null
	}

	processString(text) {

		var tokens = TokenParser.process(text)

		Lexer.lexer = this
		var s = new LexString(tokens)
		delete s.endPosition
		this.strings.push(s)
	}

}



exports.Lexer = Lexer