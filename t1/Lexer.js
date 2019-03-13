
var { TokenParser, SpaceToken, WordToken, SymbolToken, StringToken  } = require('./TokenParser.js')

class LexToken {

}

class Expression extends LexToken {

}

class Equal extends LexToken {
	constructor(namesList, exps) {
		this.namesList = namesList
		this.exps = exps
	}
}

Equal.detect = (tokens, position) => {
	var token = tokens[position]
	if(token instanceof WordToken && token.word == 'local') {

		// read name lists
		var namesList = [ ], exps = [ ]
		var stage = 0
		/*
			stage:
			0 - read name
			1 - space or , or = 
		*/
		position ++

		while(true)	{
			token = tokens[position]
			switch(stage) {

				case 0:
					if(token instanceof SpaceToken) {

					}
					else if (token instanceof WordToken) {
						namesList.push(token)
						stage = 1
					}
					else {
						return null
					}

				break

				case 1:
				if(token instanceof SpaceToken) {

				}
				else if (token instanceof SymbolToken) {
					if(token.symbol == '=') {
						stage = 2
					}
					else if (token.symbol == ',') {
						stage = 0
					}
					else {
						return null
					}
				}
				else {
					return null
				}
			break

			}			
			position ++
			if(stage == 2) break
		}

		// read initializers list
		stage = 0
		while(true)	{

		}

		return { position: position, token: new Equal(namesList, exps) }
	}
	return null
}

class SkipSpace extends LexToken { }
SkipSpace.detect = (tokens, position) => {
	if(tokens[position] instanceof SpaceToken) {
		return { position: position + 1 }
	}
	return null
}

class Lexer {

}

var detectTokens = [
	SkipSpace,
	Equal
]

Lexer.process = (tokens, position) => {

	var lextokens = [ ]
	position = position || 0
	var l = tokens.length

	while(position < l) {
		let found = false
		for(var i = 0, l1 = detectTokens.length; i < l1; i++) {
			var token = detectTokens[i]
			var result = token.detect(tokens, position)
			if(result) {
				position = result.position
				if(result.token) {
					lextokens = result.token
				}
				found = true
				break
			}
		}
		if(!found) {
			console.log(`can't detect lex token at position ${position}`)
			break
		}
	}

	return lextokens
}

exports.Lexer = Lexer