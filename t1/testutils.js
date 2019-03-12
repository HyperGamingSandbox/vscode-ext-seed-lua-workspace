
var objectName = (a) => (a.constructor && a.constructor.name) ? a.constructor.name : null
var deepCompare, arrayCompare, objectCompare

arrayCompare = (a, b) => {
	if(!Array.isArray(a) || !Array.isArray(b)) return false
	if(a.length != b.length) return false
	for(var i = 0, l = a.length; i < l; i++) {
		if(!deepCompare(a[i], b[i])) return false
	}
	return true
}

objectCompare = (a,b) => {
	if( !(a instanceof Object) || !(b instanceof Object) ) return false
	if( objectName(a) !== objectName(b) ) return false
	var checked = { }
	for(var name in a) {
		if(!deepCompare(a[name], b[name])) return false
		checked[name] = true
	}
	for(var name in b) {
		if(name in checked) continue
		if(!deepCompare(a[name], b[name])) return false
	}
	return true
}

deepCompare = (a, b) => {
	if(Array.isArray(a)) return arrayCompare(a, b)
	if(a instanceof Object) return objectCompare(a, b)
	return a === b
}

exports.objectName = objectName
exports.deepCompare = deepCompare
exports.arrayCompare = arrayCompare
exports.objectCompare = objectCompare