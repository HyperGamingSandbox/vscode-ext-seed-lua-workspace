
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
	
	getOrCreate(name, creator) {
		var o = this.get(name)
		if(o) return o
		o = creator()
		this.add(o)
		return o
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
    }
}

exports.Modules = Modules
exports.ModuleCreator = (name) => new Module(name)
exports.Method = Method
