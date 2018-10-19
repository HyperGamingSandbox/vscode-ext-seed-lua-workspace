const vscode = require('vscode');

const util = require('util');
const fs = require('fs');
const readdir = util.promisify(fs.readdir);
const stat = util.promisify(fs.stat);
const readfile = util.promisify(fs.readFile);

async function readdirEx(path, options) {
    console.log("readdirEx 1")
    options = options || { }
    var ritems = [ ]
    var folders = [ path ]

    var p = 0

    while( p < folders.length ) {
        var folder = folders[p]
        var items = await readdir(folder)
        for(var i = 0, l = items.length; i < l; i ++) {
            var item = items[i]
            var itempath = folder + "/" + item
            var stats = await stat(itempath)
            if (stats.isFile()) {
                var accepted = true

                if(options.wc) {
                    for(var j = 0, k = options.wc.length; j < k; j++) {
                        var pattern = "." + options.wc[j]
                        if(pattern.length <= item.length && pattern != item.substr(-1 * pattern.length)) {
                            accepted = false
                            break
                        }
                    }
                }

                if(accepted) {
                    ritems.push(itempath)
                }
            }
            else if (stats.isDirectory()) {
                var ignored = false
                if(options.ignoreFolders) {
                    var rel = itempath.substr(path.length + 1)
                    for(var j = 0, k = options.ignoreFolders.length; j < k; j++) {
                        if(rel == options.ignoreFolders[j]) {
                            ignored = true
                            break
                        }
                    }
                }
                if(!ignored) {
                    folders.push(itempath)
                }
            }
        }
        p ++
    }

    return ritems
}

/*
const stat = util.promisify(fs.stat);

async function callStat() {
  const stats = await stat('.');
  console.log(`This directory is owned by ${stats.uid}`);
}

*/

class Folder {
    constructor(folder) {
        this.folder = folder
        this.run = true
        this.start()
    }

    async start() {
        while(this.run) {
            // todo: read options from .seed.json
            try {
                var items = await readdirEx(this.folder, { wc: [ 'lua' ], ignoreFolders: [ 'buildtools', '.git', 'x64', 'test' ] })
                // console.log(items)
                for(var i = 0, l = items.length; i < l; i++) {
                    var filepath = items[i]
                    var content = await readfile(filepath)
                    
                }
            }
            catch(e) {
                console.log(e)
            }
            break
        }
    }
}

var currentCompletionItems = [ ]
var currentFolders = [ ]

function addWSFolders(folders) {
    // console.log('addWSFolders', folders)
    for(var i = 0, l = folders.length; i < l; i++) {
        var folderPath = folders[i];
        var folder = new Folder(folderPath)
        currentFolders.push(folder)
    }
    
}

const url = require('url');
function getWorkspaceFolders() {
    var wsfolders = [ ];
    var f = vscode.workspace.workspaceFolders;
    if(f) {
        for(var i = 0, l = f.length; i < l; i++) {
            var o = f[i];
            var u = new url.URL(o.uri);
            var wsfoler = decodeURIComponent(u.pathname.substr(1));
            wsfolders.push(wsfoler);
        }
    }
    return wsfolders;
}

/*
function onWorkspaceFoldersChanged() {
    console.log('onWorkspaceFoldersChanged');
}
*/

function activate(context) {

    console.log('started');

    addWSFolders(getWorkspaceFolders())
    
    // context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(onWorkspaceFoldersChanged) );
    
    /*
	context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(e => updateWorkSpace(status)));
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => this.updateStatus(status)));
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(e => updateStatus(status)));
    context.subscriptions.push(vscode.window.onDidChangeTextEditorViewColumn(e => updateStatus(status)));
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(e => updateStatus(status)));
    context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(e => updateStatus(status)));	
    */

    /*
   context.subscriptions.push(
       vscode.window.onDidChangeActiveTextEditor(
            function() {
                console.log('onDidChangeActiveTextEditor')
            }
       )
    );
*/

    context.subscriptions.push(
        vscode.window.onDidChangeTextEditorSelection(
             function() {
                // rescan file
             }
        )
     );
    /*
    window.onDidChangeTextEditorSelection(this._onEvent, this, subscriptions);
    window.onDidChangeActiveTextEditor(this._onEvent, this, subscriptions);
    */

   vscode.languages.registerCompletionItemProvider('lua', {
        provideCompletionItems(document, position, token, context) {
            
            console.log(`provideCompletionItems ${position.line} ${position.character}`)

            var words = [ ]

            var line = position.line
            var pos = position.character
            var ppos = -1
            var first = true

            while(true) {

                var r = document.getWordRangeAtPosition(new vscode.Position(line, pos))
                if(r) {
                    var word = document.getText(r)
                    if(first && r.end.character < position.character) {
                        var fword = document.getText(new vscode.Range(line, r.end.character, line, position.character))
                        words.unshift(fword)

                    }
                    first = false
                    if(ppos != -1) {
                        var sword = document.getText(new vscode.Range(line, r.end.character, line, ppos))
                        words.unshift(sword)                        
                    }
                    words.unshift(word)
                    ppos = r.start.character
                    pos = ppos - 1
                }
                else {
                    pos --
                }

                if(pos < 0) {
                    break
                }

            }

            /*
            const r = document.getWordRangeAtPosition(position)            

            var word = ""
            var isGlobalWord = true
            var word1m = ''
            var sign = ""

            if(r) {
                word = document.getText(r)
                if(r.start.character > 0) {
                    const r2 = document.getWordRangeAtPosition(new vscode.Position(r.start.line, r.start.character - 1))
                    if(r2) {
                        word1m = document.getText(r2)
                    }

                    var r3 = new vscode.Range(r.start.line, r.start.character - 1, r.start.line, r.start.character)
                    var ts = document.getText(r3)
                    sign = ts
    
                }
            }
            else {
                if(position.character > 0) {
                    const r2 = document.getWordRangeAtPosition(new vscode.Position(position.line, position.character - 1))
                    if(r2) {
                        word1m = document.getText(r2)
                    }

                    var r3 = new vscode.Range(position.line, position.character - 1,position.line, position.character)
                    var ts = document.getText(r3)
                    sign = ts
                }

            }

            

            console.log(`complete word '${word1m}','${sign}','${word}'`)
            */
           console.log(words)

            return [ ...currentCompletionItems
            //    , new vscode.CompletionItem(word + '_write', vscode.CompletionItemKind.Method)
             ]
            /*
            return [
                // new vscode.CompletionItem('_write', vscode.CompletionItemKind.Method)
                // , new vscode.CompletionItem('Hello World!2')
                // , createSnippetItem()
            ];
            */
        }
    });

    /*
    function createSnippetItem() {

        // Read more here:
        // https://code.visualstudio.com/docs/extensionAPI/vscode-api#CompletionItem
        // https://code.visualstudio.com/docs/extensionAPI/vscode-api#SnippetString

        // For SnippetString syntax look here:
        // https://code.visualstudio.com/docs/editor/userdefinedsnippets#_creating-your-own-snippets

        let item = new vscode.CompletionItem('Good part of the day', vscode.CompletionItemKind.Snippet);
        item.insertText = new vscode.SnippetString("Good ${1|morning,afternoon,evening|}. It is ${1}, right?");
        item.documentation = new vscode.MarkdownString("Inserts a snippet that lets you select the _appropriate_ part of the day for your greeting.");

        return item;
    }
    */
}
exports.activate = activate;

function deactivate() {
    console.log('deactivate');
    currentFolders = [ ]
}

exports.deactivate = deactivate;