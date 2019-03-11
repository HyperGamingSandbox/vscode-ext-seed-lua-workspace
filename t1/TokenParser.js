
class Token {

	constructor(startPosition) {
		this.startPosition = startPosition
	}

	setEnd(position, text) {
		this.endPosition = position - 1
		this.onEnd(text)
	}

	onEnd() { }

	needSubProcess() { return false }
}




class SpaceToken extends Token {	
	isBody(c) {
		return SpaceToken.isValid(c)
	}	
}

const _s1 = " ".charCodeAt(0)
const _s2 = "\t".charCodeAt(0)

SpaceToken.isValid = (c) => c == _s1 || c == _s2



class WordToken extends Token {	
	isBody(c) {
		return WordToken.isValid(c)
	}
	onEnd(text) {
		this.word = text.substr(this.startPosition, this.endPosition - this.startPosition  +1)
	}
}

const _a = 'a'.charCodeAt(0)
const _z = 'z'.charCodeAt(0)
const _A = 'A'.charCodeAt(0)
const _Z = 'Z'.charCodeAt(0)
const __ = '_'.charCodeAt(0)

WordToken.isValid = (c) => (c >= _a && c <= _z) || (c >= _A && c <= _Z) || c == __



class WordToken extends Token {	
}


var validTokens = [
	SpaceToken,
	WordToken
]

class TokenParser {
}

TokenParser.process = (text) => {

	var tokens = [ ], currentToken = null
	var i = 0, l = text.length

	var endToken = () => {
		currentToken.setEnd(i, text)
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
					currentToken = new token(i)
					break
				}
			}

			if(currentToken.needSubProcess()) {
				var [ newPosition, token ] = currentToken.subProcess(text, i)
				i = newPosition
				currentToken = token
				endToken()
				continue
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

