
var { TokenParser, SpaceToken, WordToken, SymbolToken  } = require('./TokenParser.js')
var { Lexer } = require('./Lexer.js')

var tokens = TokenParser.process("local a = asd")
var lextokens = Lexer.process(tokens)

console.log(lextokens)