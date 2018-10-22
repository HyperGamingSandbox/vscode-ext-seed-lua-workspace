const vscode = require('vscode');
const Parser = require("./sourceParser.js").Parser

const util = require('util');
const fs = require('fs');
const path = require('path')

const readdir = util.promisify(fs.readdir);
const stat = util.promisify(fs.stat);
const readfile = util.promisify(fs.readFile);
const fileexists = util.promisify(fs.exists);

async function readdirEx(path, options) {
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
                    accepted = false
                    for(var j = 0, k = options.wc.length; j < k; j++) {
                        var pattern = "." + options.wc[j]
                        if(pattern.length <= item.length && pattern == item.substr(-1 * pattern.length)) {
                            accepted = true
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
                        if(rel == options.ignoreFolders[j] || options.ignoreFolders[j] == item) {
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

var __wc_block_bounds = {
    lua: {
        open: [ '--[[' ],
        close: [ ']]' ]
    },
    cpp: {
        open: [ '--[[', '/***' ],
        close: [ ']]', '***/' ]
    },
    h: {
        open: [ '--[[', '/***' ],
        close: [ ']]', '***/' ]
    }
}
function __checkBlockBounds(line, wc, bound) {
    var checkers = __wc_block_bounds[wc][bound ? 'open' : 'close']
    for(var i = 0, l = checkers.length; i < l; i++) {
        if(checkers[i] == line) return true
    }
    return false;
}

class DocObject {

    constructor(name, type) {
        this.name = name
        this.type = type || 'unknown'
    }

    dump1(level) {
        level = level || 0
        var align = "  ".repeat(level)
        if(this.list) {
            for(var i = 0, l = this.list.length; i < l; i++) {
                var item = this.list[i]
                console.log(`[*] ${align}${item.type}:${item.name} ${item.info ? item.info : ''}`)
                item.dump1(level + 1)
            }
        }
    }


    blockline(line) {

    }

    paramReactions() { return { } }

    processParam(ctx, param, value) {
        var root = this
        while (true) {
    
            var r = root.paramReactions()
            if (param in r) {
                if (root != ctx.curObject) {
                    ctx.curObject = root
                }
                r[param](this, ctx, param, value)
                return
            }
    
            if (!root.parent) { break }
            root = root.parent
        }
    
        // self:warn(ctx.lineNumber, string.format("unknown @param '%s'", param))
        console.log(`[!] unknown param '${param}' at object '${this.type}'`)
    
    }

    getParent(type) {
	    if (this.type == type) { return this }
	    return this.parent.getParent(type)
    }

    add(obj) {
        if (!('list' in this)) this.list = [];
        this.list.push(obj)
        obj.parent = this
    }

    get(name, type) {
	    if (!('list' in this)) return null;
	    for (var i = 0, l = this.list.length; i < l; i++) {
		    var obj = this.list[i]
		    if (obj.name == name) {
                if(type) {
                    if(type == obj.type) {
                        return obj;
                    }
                }
                else {
                    return obj;
                }
            }
        }
        return null
    }

    each(cb) {
        if(this.list) {
            for (var i = 0, l = this.list.length; i < l; i++) {
                cb(this.list[i])
            }
        }
    }

}

var classReactions = {
    method: methodSpawner    
}

class Class extends DocObject {

    constructor(name) {
        super(name, 'class')
    }

    paramReactions() { return classReactions }

}

function classSpawner(parent, ctx, param, value) {
	var module = ctx.curObject.getParent('module')
	var o = module.get(value)
	if (!o) {
		o = new Class(value)
		o.level = ctx.level
		o.id = ctx.id
		ctx.id ++
		module.add(o)
    }			
	ctx.level ++
	ctx.curObject = o
}

var re_return_1 = /^(Class)\s+([^.]+)\.([\S]+)\s*$/;

class Return extends DocObject {

    constructor(name) {

        super('return', 'return')

        var m = name.match(re_return_1)
        if(m) {
            this.returnType = 'class'
            this.returnModule = m[2]
            this.returnClassName = m[3]
        }
    }
    

}

function returnSpawner(parent, ctx, param, value) {
	var r = new Return(value, param, ctx.level)
	ctx.curObject.add(r)
}

var methodReactions = {    
    return: returnSpawner
}
var re_method_name_1 = /^([a-zA-Z_\d]+)(.*)$/;
class Method extends DocObject {

    constructor(name) {
        var m = name.match(re_method_name_1)
        var info = ''
        if(m) {
            name = m[1]
            info = m[2]
        }
        super(name, 'method')
        this.info = info
    }

    paramReactions() { return methodReactions }

}

function methodSpawner(parent, ctx, param, value) {
	var method = new Method(value, param, ctx.level)
	// method.level = ctx.level
	method.id = ctx.id
	ctx.id ++
	ctx.curObject.add(method)
	ctx.curObject = method
}

class Const extends DocObject {

    constructor(name) {
        super(name, 'const')
    }

}

function constSpawner(parent, ctx, param, value) {
	var c = new Const(value, param, ctx.level)
	ctx.curObject.add(c)
}

function ModuleSpawner(parent, ctx, param, value) {
	var module = ctx.modules.get(value)
	if (!module) {
		module = new Module(value)
		ctx.modules.add(module)
    }
	ctx.curObject = module
}

var re_param = /^\s*@([a-zA-Z\d_]+):\s*(.*)$/;

var moduleReactions = {
    class: classSpawner,
    method: methodSpawner,
    module: ModuleSpawner,
    const: constSpawner
}

class Module extends DocObject {

    constructor(name) {
        super(name, 'module')
    }

    paramReactions() { return moduleReactions }

    parseBlock(ctx, block) {
        
        ctx.curObject = this
        ctx.level = 1

        for(var i = 0, l = block.length; i < l; i++) {
            var line = block[i]
            if(line.length < 1) continue

            var m = line.match(re_param)
            if(m) {
                ctx.curObject.processParam(ctx, m[1], m[2])
                // console.log(m)
            }
            else {
                ctx.curObject.blockline(line)
            }

        }
    }

    async parse(ctx, filepath, content) {
        content = content.toString()
        if(typeof(content) != "string" || content.length < 1) return
        var wc = path.extname(filepath).substr(1)
        
        var lines = content.split("\n")
        var inblock = false, block
        for(var i = 0, l = lines.length; i < l; i++) {
            var line = lines[i].replace(/^\s+|\s+$/g, "")
            if(inblock) {
                if(__checkBlockBounds(line, wc, false)) {
                    inblock = false
                    this.parseBlock(ctx, block)
                }
                else {
                    block.push(line)
                }
            }
            else {
                if(__checkBlockBounds(line, wc, true)) {
                    inblock = true
                    block = [ ]
                }
            }
        }

    }
}

class Modules extends DocObject {

    constructor() {
        super('modules', 'modules')
        // this.modules = { }
    }

    /*
        getModule(moduleName) {
        if(!(moduleName in this.modules)) {
            this.modules[moduleName] = new Module(moduleName)
        }
        return this.modules[moduleName]
    }
    */
}

var modules = new Modules()


class ModuleFilenameDetecter {

    constructor() {
        this.dirs = { }
        this.packages = { }
    }

    async getModuleName(filepath) {
        var dir = path.dirname(filepath)
        dir = dir.replace("\\", "/")
        // console.log(`getModuleName ${dir}`)

        if(!(dir in this.dirs)) {
            // check for package.json
            var p = dir + "/package.json"
            if(!(p in this.packages)) {
                var e = false, isFile = false, parsed = false
                var obj = null

                e = await fileexists(p)
                if(e) {                    
                    var stats = await stat(p)
                    isFile = stats.isFile()
                }

                if (e && isFile) {
                    var content = await readfile(p)                    
                    try {
                        obj = JSON.parse(content)
                        parsed = true
                    }
                    catch(e) {
                        obj = null
                    }
                }

                if (e && isFile && parsed && typeof(obj) == "object" && ("module" in obj)) {
                    this.packages[p] = obj
                }
                else {
                    this.packages[p] = null
                }
            }
            p = this.packages[p]
            if(!p) {
                // need go upper
                var f = dir.lastIndexOf("/")
                if(f != -1) {
                    this.dirs[dir] = await this.getModuleName(dir.substr(0, f) + "/1")
                }
                else {
                    this.dirs[dir] = null
                }
            }
            else {
                this.dirs[dir] = p.module
            }
        }

        return this.dirs[dir]
    }

}
var moduleFilenameDetecter = new ModuleFilenameDetecter()

class Folder {
    constructor(folder) {
        this.folder = folder
        this.run = true
        this.start()
    }

    async start() {
        console.log(`start folder '${this.folder}'`)
        while(this.run) {
            // todo: read options from .seed.json
            try {
                var ctx = { id: 1, modules: modules }
                var items = await readdirEx(this.folder, { wc: [ 'lua', 'cpp' ], ignoreFolders: [ 'buildtools', '.git', 'x64', 'test' ] })
                console.log(`folder ${this.folder} file readed ${items.length}`)
                // console.log(items)
                for(var i = 0, l = items.length; i < l; i++) {
                    var filepath = items[i]
                    var content = await readfile(filepath)
                    // detect module
                    var moduleName = await moduleFilenameDetecter.getModuleName(filepath)
                    var module = modules.get(moduleName)
                    if(!module) {
                        module = new Module(moduleName)
                        modules.add(module)                    
                    }
                    await module.parse(ctx, filepath, content)
                    // console.log(`file: ${filepath}`)
                    // console.log(`module: ${module.name}`)
                    
                }
                console.log(`folder '${this.folder}' inited`)
                modules.dump1()
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

var __keywords = [
    { name: 'local', type: 'operand' }
]
function _typeToCompletionItemKind(type) {

    switch(type) {
        case 'operand': return vscode.CompletionItemKind.Keyword;
        case 'module': return vscode.CompletionItemKind.Module;
        case 'const': return vscode.CompletionItemKind.Constant;
        case 'method': return vscode.CompletionItemKind.Method;
    }
    console.log(`_typeToCompletionItemKind wrong type ${type}`)
    return null
}

function activate(context) {

    console.log('started');

    modules = new Modules()

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
            
            // console.log(`provideCompletionItems ${position.line} ${position.character}`)
            var retArray = [ ]

            try {

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
                        __unshift(words, fword, true)

                    }
                    first = false
                    if(ppos != -1) {
                        var sword = document.getText(new vscode.Range(line, r.end.character, line, ppos))
                        __unshift(words, sword, true)
                    }

                    __unshift(words, word)

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

            //console.log(words)

            var newline = [ ]
            var symbol = false
            var isopen = 0
            for(var i = words.length - 1; i >= 0; i--) {
                var w = words[i]

                // console.log(w)

                if(isopen > 0) {
                    // console.log(1)
                    if(w == '(') {
                        // console.log(2)
                        isopen --
                        symbol = false
                    }
                    continue
                }

                if(__isword(w)) {
                    // console.log(3)
                    symbol = false
                    newline.unshift(w)
                }
                else {
                    // console.log(4)
                    if(symbol) {
                        // console.log(5)
                        if(w == ")") {
                            // console.log(6)
                            isopen ++
                            continue
                        }
                        else {
                            break
                        }
                    }
                    if(w == '.' || w == ':') {
                        // console.log(7)
                        symbol = true
                        newline.unshift(w)
                    }
                    else {
                        break
                    }
                }
            }
            words = newline
            console.log(words)

            var parser = new Parser(document.getText(new vscode.Range(0, 0, position.line, 0)).split("\n"))
            console.log(parser)

            var root = modules, mode = "read_name"
            var i = 0, l = words.length, last_name = ""
            var detectState = true
            while(i < l && detectState) {
                var word = words[i]
                switch(mode) {

                case "read_name":
                    if(__isword(word)) {
                        last_name = word
                        mode = "read_accessor"
                    }
                    else {
                        console.log(`wrong read name ${i} ${word}`)
                        detectState = false
                    }
                break

                case "read_accessor":
                    if(word == "." || word == ":") {
                        var o = null

                        console.log(`read_accessor ${last_name}`)
                        console.log(root)

                        if(root.type == "modules") {
                            var v = parser.addVariable(last_name, true)
                            if(v) {
                                if(v.type == "module") {
                                    o = modules.get(v.value)
                                }    
                                else {
                                    console.log(`unknown type ${i} ${word}`)
                                    detectState = false    
                                }
                            }
                            else {
                                console.log(`can't read variable ${i} ${word}`)
                                detectState = false
                            }
                        }
                        else if (root.type == "method") {
                            var r = root.get('return', 'return')
                            var ro = null
                            if(r) {
                                console.log(`got return`)
                                if(r.returnType == 'class')  {
                                    console.log(`return type class`)
                                    var m = modules.get(r.returnModule)
                                    if(m) {
                                        console.log(`return type from module ${m.name} class name ${r.returnClassName}`)
                                        ro = m.get(r.returnClassName)
                                    }
                                }
                            }                            
                            if(ro) {
                                o = ro.get(last_name)
                            }
                        }
                        else {
                            o = root.get(last_name)
                        }

                        if(o) {
                            last_name = ""
                            root = o
                            console.log("readed")
                            console.log(root)
                        }
                        else {
                            console.log(`wrong get object ${i} ${last_name}`)
                            console.log(root)
                            detectState = false    
                        }

                        if(detectState) {
                            mode = "read_name"
                        }
                    }
                    else {
                        console.log(`wrong read accessor ${i} ${word}`)
                        detectState = false
                    }
                break

                }
                i++
            }

            if(detectState) {

                console.log("detectState true")
                var l = last_name.length

                if(root.type == "modules") {

                    for(var name in parser.variables) {
                        var v = parser.variables[name]
                        // console.log(v)
                        if(name.length >= l && last_name == name.substr(0, l)) {
                            retArray.push(new vscode.CompletionItem(name, _typeToCompletionItemKind(v.type)))
                        }
                    }

                    var core = modules.get('Core')
                    if(core) {
                        core.each(function(item) {
                            if(item.name.length >= l && last_name == item.name.substr(0, l)) {
                                retArray.push(new vscode.CompletionItem(item.name, _typeToCompletionItemKind(item.type)))
                            }
                        })
                    }
                    // keywords !!
                    for(var i = 0, l = __keywords.length; i < l; i++) {
                        var item = __keywords[i]
                        if(item.name.length >= l && last_name == item.name.substr(0, l)) {
                            retArray.push(new vscode.CompletionItem(item.name, _typeToCompletionItemKind(item.type)))
                        }
                    }                    
                }
                else {
                    var c = null
                    if(root.type == "module") {
                        console.log("read from module")
                        c = root
                    }
                    else {
                        var r = root.get('return', 'return')
                        if(r) {
                            console.log(`got return`)
                            if(r.returnType == 'class')  {
                                console.log(`return type class`)
                                var m = modules.get(r.returnModule)
                                if(m) {
                                    console.log(`return type from module ${m.name} class name ${r.returnClassName}`)
                                    c = m.get(r.returnClassName)
                                }
                            }
                        }
                    }

                    if(c) {
                        console.log(`got return class part ${last_name}`)
                        console.log(c)
                        c.each(function(item) {
                            if(last_name.length <= item.name.length && last_name == item.name.substr(0, last_name.length)) {
                                retArray.push(new vscode.CompletionItem(item.name, _typeToCompletionItemKind(item.type)))
                            }
                        })
                    }

                }

            }


            /*

            if(words.length == 0) {

                for(var name in parser.variables) {
                    var v = parser.variables[name]
                    // console.log(v)
                    retArray.push(new vscode.CompletionItem(name, _typeToCompletionItemKind(v.type)))
                }

                var core = modules.get('Core')
                if(core) {
                    core.each(function(item) {
                        retArray.push(new vscode.CompletionItem(item.name, vscode.CompletionItemKind.Method))
                    })
                }

                for(var i = 0, l = __keywords.length; i < l; i++) {
                    var item = __keywords[i]
                    retArray.push(new vscode.CompletionItem(item.name, _typeToCompletionItemKind(item.type)))                    
                }                
            }
            else if(words.length == 1 && __isword(words[0])) {
                // console.log('case 1')
                var core = modules.get('Core')
                var word = words[0]
                var l = word.length

                for(var name in parser.variables) {
                    var v = parser.variables[name]
                    // console.log(v)
                    if(name.length >= l && word == name.substr(0, l)) {
                        retArray.push(new vscode.CompletionItem(name, _typeToCompletionItemKind(v.type)))
                    }
                }

                if(core) {
                    core.each(function(item) {
                        if(item.name.length >= l && word == item.name.substr(0, l)) {
                            retArray.push(new vscode.CompletionItem(item.name, vscode.CompletionItemKind.Method))
                        }
                    })
                }
                // keywords !!
                for(var i = 0, l = __keywords.length; i < l; i++) {
                    var item = __keywords[i]
                    if(item.name.length >= l && word == item.name.substr(0, l)) {
                        // vscode.CompletionItemKind.Method
                        retArray.push(new vscode.CompletionItem(item.name, _typeToCompletionItemKind(item.type)))
                    }
                }
            }
            else {
                // try to recognize chain like this "a.b:a().a"
                console.log(words)
                var root = modules, mode = ""
                var i = 0, l = words.length, idx = 0, lastItem = ""
                while(i < l) {
                    var item = words[i]
                    if(__isword(item) && i % 2 == 0) {
                        if(root) {                            
                            if(idx == 0) {
                                var v = parser.addVariable(item)
                                if(v.type == "module") {
                                    root = modules.get(v.value)
                                    idx ++
                                }
                                else {
                                    console.log("idx 0 wrong type")
                                }
                            }
                            else {
                                if(root.type == "module") {
                                    if(i + 1 != l) {
                                        var v = root.get(item)
                                        root = v
                                        idx ++
                                    }
                                    else {
                                        lastItem = item
                                        console.log("last item")
                                    }
                                }
                                else {
                                    console.log("idx > 0")
                                }
                            }
                        }
                    }
                    else if (i % 2 == 1 && (item == "." || item == ":")) {
                        mode = "access property"                        
                    }
                    else {
                        console.log("end recognize chain")
                        break
                    }
                    i ++
                }

                if(mode == "access property") {
                    if(root) {
                        console.log(`access module property '${root.type}' '${root.name}'`)
                        if(root.type == "module") {
                            root.each(function(item) {
                                // if(item.type == )
                                if(lastItem.length <= item.name.length && lastItem == item.name.substr(0, lastItem.length)) {
                                    retArray.push(new vscode.CompletionItem(item.name, _typeToCompletionItemKind(item.type)))
                                }
                            })
                        }
                        else if(root.type == "method") {
                            console.log("reading method return type")
                            console.log(root)
                            var r = root.get('return', 'return')
                            if(r) {
                                console.log(`got return`)
                               if(r.returnType == 'class')  {
                                    console.log(`return type class`)
                                   var m = modules.get(r.returnModule)
                                   if(m) {
                                        console.log(`return type from module ${m.name} class name ${r.returnClassName}`)
                                       var c = m.get(r.returnClassName)
                                       if(c) {
                                           console.log(`got return class part ${lastItem}`)
                                           console.log(c)
                                            c.each(function(item) {
                                                // if(item.type == )
                                                if(lastItem.length <= item.name.length && lastItem == item.name.substr(0, lastItem.length)) {
                                                    retArray.push(new vscode.CompletionItem(item.name, _typeToCompletionItemKind(item.type)))
                                                }
                                            })
                                       }
                                   }
                               }
                            }
                        }
                    }
                }
            }
            */
            } catch(e) {
                console.log(e)
            }

           console.log("returning")

            return retArray // [ ...currentCompletionItems
            //    , new vscode.CompletionItem(word + '_write', vscode.CompletionItemKind.Method)
            // ]
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

    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {

        if (e.affectsConfiguration('conf.workspace.cachPath')) {
            console.log('conf.workspace.cachPath ' + vscode.workspace.getConfiguration().get('conf.workspace.cachPath'))
        }

    }));

}
exports.activate = activate;

function deactivate() {
    console.log('deactivate');
    currentFolders = [ ]
}

exports.deactivate = deactivate;