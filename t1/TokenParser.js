
class Token {

	constructor(startPosition, text) {
		this.startPosition = startPosition
		this.onInit(text)
	}

	setEnd(position, text) {
		this.endPosition = position - 1
		return this.onEnd(text, position)
	}

	onEnd(text, position) { return position }
	onInit() { }
}




class SpaceToken extends Token {	
	isBody(c) {
		return SpaceToken.isValid(c)
	}	
}

const _s1 = " ".charCodeAt(0)
const _s2 = "\t".charCodeAt(0)

SpaceToken.isValid = (c) => c == _s1 || c == _s2


var operators = {}
'local,for,end,function,while,break'.split(',').forEach( i => operators[i] = true )

class WordToken extends Token {	
	isBody(c) {
		return WordToken.isValid(c)
	}
	onEnd(text, position) {
		this.word = text.substr(this.startPosition, this.endPosition - this.startPosition  +1)
		if(this.word in operators) this.isOperator = true
		return position
	}
}

const _a = 'a'.charCodeAt(0)
const _z = 'z'.charCodeAt(0)
const _A = 'A'.charCodeAt(0)
const _Z = 'Z'.charCodeAt(0)
const __ = '_'.charCodeAt(0)

WordToken.isValid = (c) => (c >= _a && c <= _z) || (c >= _A && c <= _Z) || c == __



var allowedSymbols = { }
'()=,.:<>'.split('').forEach(s => allowedSymbols[s] = true)

class SymbolToken extends Token {

	onInit(text) {
		if(text) {
			this.part = text.substr(this.startPosition, 1)
			this.count = 0
		}
	}

	isBody(c) {

		this.count ++

		if(this.count == 1) {
			var s = String.fromCharCode(c)
			if(this.part == '=' && s == '=') {
				return true
			}
		}

		return false
	}
	onEnd(text, position) {
		delete this.part
		delete this.count
		this.symbol = text.substr(this.startPosition, this.endPosition - this.startPosition  + 1)
		return position
	}
}

SymbolToken.isValid = (c) => String.fromCharCode(c) in allowedSymbols




const _q1 = '"'.charCodeAt(0)
const _q2 = "'".charCodeAt(0)

class StringToken extends Token {
	
	onInit(text) {
		if(text) {
			this.quote = text.substr(this.startPosition, 1)
		}		
	}

	isBody(c) {
		return this.quote.charCodeAt(0) != c
	}

	onEnd(text, position) {
		this.symbol = text.substr(this.startPosition + 1, this.endPosition - this.startPosition)
		return position + 1
	}
}

StringToken.isValid = (c) => c == _q1 || c == _q2


var validTokens = [
	SpaceToken,
	WordToken,
	SymbolToken,
	StringToken
]

class TokenParser {
}

TokenParser.process = (text) => {

	var tokens = [ ], currentToken = null
	var i = 0, l = text.length

	var endToken = () => {
		i = currentToken.setEnd(i, text)
		tokens.push(currentToken)
		currentToken = null
	}

	while(i < l) {
		var c = text.charCodeAt(i)
		if(currentToken) {
			if(!currentToken.isBody(c)) {
				endToken()
				continue
			}
		}
		else {

			for(var i1 = 0, l1 = validTokens.length; i1 < l1; i1++) {
				var token = validTokens[i1]
				if(token.isValid(c)) {
					currentToken = new token(i, text)
					break
				}
			}

			if(!currentToken) {
				console.log(`unknown character at ${i}`)
				return null
			}
		}
		i++
	}
	endToken()
	return tokens
}

exports.TokenParser = TokenParser

exports.SpaceToken = SpaceToken
exports.WordToken = WordToken
exports.SymbolToken = SymbolToken
exports.StringToken = StringToken
