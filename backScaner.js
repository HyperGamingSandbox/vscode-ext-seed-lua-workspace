
const vscode = require('vscode')
const Position = vscode.Position
const Range = vscode.Range

function __trim(a) {
    return a.replace(/^\s+|\s+$/g, "")
}

function __unshift(words, word, symbols) {
    
    word = word.replace(/^\s+$/g, " ")
    if(word == " ") {
        words.unshift(" ")
        return
    }
    
    if(symbols) { } else {
        word = __trim(word)
    }
    if(symbols) {
        word = word.replace(/\s+/g, " ")

        //var a = word.split(" ")
        //for(var i = a.length - 1; i  >= 0; i--) {
            //var item = a[i]
            for(var j = word.length - 1; j >= 0; j--) {
                var c = word[j]
                // if(c != ' ') {
                    words.unshift(c)
                // }
            }
        // }
    }
    else {
        if(word.length > 0) {
            words.unshift(word)
        }
    }
}

function __isword(word) {
    // console.log(`'${word}'`)
    if(word && typeof(word) == "string") {
        return word.match(/^[a-zA-Z_\d]+$/)
    }
    return false
}

 
function scaner(document, position) {
    var words = [ ], line = position.line, pos = position.character, ppos = -1, first = true
    while(true) {
        var r = document.getWordRangeAtPosition(new Position(line, pos))
        if(r) {
            var word = document.getText(r)
            if(first && r.end.character < position.character) {
                var fword = document.getText(new Range(line, r.end.character, line, position.character))
                __unshift(words, fword, true)
            }
            first = false
            if(ppos != -1) {
                var sword = document.getText(new Range(line, r.end.character, line, ppos))
                __unshift(words, sword, true)
            }

            __unshift(words, word)

            ppos = r.start.character
            pos = ppos - 1
        }
        else {
            pos --
        }

        if(pos < 0) break
    }

    return words
 }

 exports.scaner = scaner
 exports.__trim = __trim
 exports.__isword = __isword