
const vscode = require('vscode');

const Parser = require("./sourceParser.js").Parser
const doctools = require("./doctools.js")

function activate(context) {

	console.log('started', doctools);
		
	vscode.languages.registerHoverProvider({ scheme: 'file', language: 'lua' }, {
		provideHover(document, position, token) {
			console.log(`provideHover ${position.line} ${position.character}`)

            var parser = new Parser(document.getText(new vscode.Range(0, 0, position.line, 0)).split("\n"))
            console.log(parser)

			return new vscode.Hover(`    
Hello **World**    
    aasdasdasd    
	asd

[Node.js](https://nodejs.org)
`)
		}
	})
	
}

exports.activate = activate;