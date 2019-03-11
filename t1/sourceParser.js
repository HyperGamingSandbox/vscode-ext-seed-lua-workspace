
const _a = 'a'.charCodeAt(0)
const _z = 'z'.charCodeAt(0)
const _A = 'A'.charCodeAt(0)
const _Z = 'Z'.charCodeAt(0)
const __ = '_'.charCodeAt(0)
const _dot = '.'.charCodeAt(0)

const _q1 = '"'.charCodeAt(0)
const _q2 = "'".charCodeAt(0)

const _s1 = " ".charCodeAt(0)
const _s2 = "\t".charCodeAt(0)

const _symbols = {
    ',': true,
    '=': true,
    ':': true,
    '(': true,
    ')': true,
}

const _tword = Symbol("word")
const _tsymbol = Symbol("symbol")
const _tstring = Symbol("string")
const _tspace = Symbol("space")

function parseLineForTokens(line) {

    var tokens = [ ], mode = 0, token, q

    /*
    0 - initial state, search for tokens
    1 - token word
    2 - token concat
	3 - token string
	4 - token space
    */

    for(var i = 0, l = line.length; i < l; i++) {

        var c = line.charCodeAt(i), s = line.charAt(i)
        // console.log(`code ${c} symbol '${s}'`)
        var processed = false
        do {
            switch(mode) {

                case 0:
                if( c == _q1 || c == _q2 ) {
                    mode = 3
                    token = ""
                    q = c
                    processed = true
                }
                else if(c == _dot) {
                    mode = 2
                    token = ""
                }
                else if( (c >= _a && c <= _z) || (c >= _A && c <= _Z) || c == __) {
                    // console.log(`mode 0 start reading word`)
                    // start token word                    
                    mode = 1
                    token = ""
                }
                else if(s in _symbols) {
                    tokens.push({ token:_tsymbol, symbol: s })
                    processed = true
                }
                else {
                    processed = true
                }
                break;

                case 1:
                if( (c >= _a && c <= _z) || (c >= _A && c <= _Z) || c == __) {
                    // console.log(`mode 1 read char '${s}`)
                    processed = true
                    token += s
                }
                else {
                    // console.log(`mode 1 stop reading word '${token}'`)
                    mode = 0
                    tokens.push({ token: _tword, work: token })
                }
                break
                
                case 2:
                if(c == _dot) {
                    token += "."
                    if(token.length == 2) {
                        tokens.push(_tsymbol, "..")
                        mode = 0
                    }
                    processed = true
                }
                else {
                    if(token.length == 1) {
                        tokens.push(_tsymbol, ".") 
                    }
                    mode = 0
                }                
                break

                case 3:
                if(c == q) {
                    tokens.push({ token: _tstring, string: token }) 
                    mode = 0
                    processed = true
                }
                else {
                    token += s
                    processed = true
                }
                break

            }
        } while(!processed)
    }

    return tokens
}


class Parser {
    constructor(lines) {
        this.variables = { }
        for(var i1 = 0, l1 = lines.length; i1 < l1; i1++) {
            var line = lines[i1]
            var tokens = parseLineForTokens(line)
            // console.log(line)
            // console.log(tokens)

            // local
            if(tokens[0] == _tword && tokens[1] == "local") {
                // read variables list
                // local a,b,c,b
                // console.log(tokens)
                var list = [ ]
                var i = 2, l = tokens.length
                for(; i < l; i += 2) {
                    var token = tokens[i], value = tokens[i + 1]
                    if (token == _tword) {
                        list.push(value)
                        this.addVariable(value)
                    }
                    else if (token == _tsymbol && value == ",") {
                        // continue
                    }
                    else {
                        // i += 2
                        break
                    }
                }
                // console.log(`i ${i} l ${l}`)

                if(i < l) {

                    var token = tokens[i], value = tokens[i + 1]

                    // assign
                    // local a,b,c,d =
                    if(token == _tsymbol && value == "=") {
                        i += 2
                        var token = tokens[i], value = tokens[i + 1]
                        if(token == _tword && value == "require") {
                            // local a,b,c,d = require
                            i += 2
                            var token = tokens[i], value = tokens[i + 1]
                            if(token == _tsymbol && value == "(") {
                                // local a,b,c,d = require(
                                i += 2
                                var token = tokens[i], value = tokens[i + 1]
                                if(token == _tstring) {
                                    // local a,b,c,d = require("asd,asd,asd,asd"
                                    if(value.substr(0,1) == "-") {
                                        var modules = value.substr(1).split(","), ml = modules.length
                                        for(var i = 0, l = list.length; i < l; i++) {
                                            var v = this.addVariable(list[i])
                                            if(i >= ml) break;
                                            v.type = "module"
                                            v.value = modules[i]
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

            }
        }
    }

    addVariable(name) {
        if(! (name in this.variables) ) {
            this.variables[name] = { }
        }
        return this.variables[name]
    }
}

exports.parseLineForTokens = parseLineForTokens
exports.Parser = Parser