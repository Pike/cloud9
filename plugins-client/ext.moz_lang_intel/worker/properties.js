define("ext/moz_lang_intel/worker/refcache", ["require", "exports", "module"], function(require, exports, module){
    var cache = {};
    exports.getReference = function _getReference(path, callback, that, args) {
        var cacheEntry;
        if (cache.hasOwnProperty(path)) {
            cacheEntry = cache[path];
            if (cacheEntry.loaded) {
                args.unshift(cacheEntry.ast);
                callback.apply(that, args);
            }
            else {
                cacheEntry.onLoad.push([callback, that, args]);
            }
        }
        else {
            cacheEntry = {
                loaded: false,
                onLoad: [[callback, that, args]],
                ast: null
            };
            cache[path] = cacheEntry;
            postMessage({type: "moz:l10n",
                         name: "reference",
                         data: {path:path}});
        }
    };
    exports.setReference = function _addReference(origpath, refpath, ast) {
        var cacheEntry, i, ii, onload;
        if (!cache.hasOwnProperty(origpath)) {
            cache[origpath] = {
                loaded: true,
                ast: ast,
                refpath: refpath,
                onLoad: []
            };
        }
        else {
            cacheEntry = cache[origpath];
            cacheEntry.loaded = true;
            cacheEntry.ast = ast;
            cacheEntry.refpath = refpath;
            for (i=0, ii=cacheEntry.onLoad.length; i<ii; ++i) {
                onload = cacheEntry.onLoad[i];
                try {
                    onload[2].unshift(cacheEntry.ast);
                    onload[0].apply(onload[1], onload[2]);
                }
                catch (e) {
                    console.error(e);
                }
            }
            cacheEntry.onLoad = [];
        }
    };
    exports.dropReference = function _dropReference(origpath) {
        if (cache.hasOwnProperty(origpath)) {
            delete cache[origpath];
        }
    };
});

define("ext/moz_lang_intel/worker/properties", ["require", "exports", "module"], function(require, exports, module) {
/*global main*/

var baseLanguageHandler = require('ext/language/base_handler');
var tree = require('treehugger/tree');
var addParentPointers = require('treehugger/traverse').addParentPointers;
var parse = require('ext/moz_lang_intel/parser/properties');
var refs = require('ext/moz_lang_intel/worker/refcache');

var handler = module.exports = Object.create(baseLanguageHandler);

handler.init = function(callback) {
    main.moz_setReference = function(origpath, refpath, contents) {
        var _self = this;
        for (var i=0, ii=_self.handlers.length; i<ii; ++i) {
            var handler = _self.handlers[i];
            if (handler.handlesLanguage(_self.$language) &&
                handler.hasOwnProperty('moz_setReference')) {
                    handler.moz_setReference(origpath, refpath, contents);
            }
        }
    };
    callback();
};

handler.handlesLanguage = function(language) {
  var handles = language === 'properties';
  return handles;
};

handler.parse = function(code, callback) {
  var result = parse(code);
  callback(result);
};

handler.findNode = function(ast, pos, callback) {
    var n = ast.findNode(pos);
    console.log('findNode', pos, n?n.toString():null);
    callback(n);
};


handler.complete = function(doc, fullAst, pos, currentNode, callback) {
    refs.getReference(this.path, this._complete, this,
                      [doc, fullAst, pos, currentNode, callback]);
};
handler._complete = function(refAst, doc, fullAst, pos, currentNode, callback) {
    var rv = [], p;
    console.log('*prop complete*', this.path);
    if (refAst) {
        var isWS = tree.parse("Whitespace(_)");
        if (!currentNode || isWS.match(currentNode)) {
            if (currentNode) console.log(currentNode.parent);
            if (!currentNode || !currentNode.parent || !currentNode.parent.parent) {
            // toplevel
                var keys = {};
                fullAst.traverseTopDown("Key(k)", function (match) {
                    keys[match.k.value] = true; 
                });
                addParentPointers(refAst);
                refAst.traverseTopDown("Key(k)", function (match) {
                    var k = match.k.value;
                    var values;
                    if (!keys.hasOwnProperty(k)) {
                        values = [];
                        match.k.parent.parent.traverseTopDown(function() {
                            if (this.value) {
                                values.push(this.value);
                            }
                        });
                        rv.push({
                            name: '`'+ k + '` (missing)',
                            replaceText: values.join(''),
                            icon: null,
                            score: 60,
                            meta: "",
                            priority: 60
                        });
                    }
                });
            }
        }
        
    }
  callback(rv);
};

handler.analyze = function(value, ast, callback) {
  refs.getReference(this.path, this._analyze, this, [value, ast, callback]);
};
handler._analyze = function(refAst, value, ast, callback) {
  var rv = [], p;
  console.log('*prop worker analyzing*:', this.path);
  if (refAst) {
      var refkeys = {}, keys = {};
      refAst.traverseTopDown("Key(k)", function(match) {
         refkeys[match.k.value] = match; 
      });
      addParentPointers(ast);
      ast.traverseTopDown("Key(k)", function(match) {
         keys[match.k.value] = match;
         if (!refkeys.hasOwnProperty(match.k.value)) {
             p = match.k.parent.parent.getPos();
             rv.push({pos: p, type: 'info', level: 'info', message: '`'+match.k.value+'` is obsolete'});
         }
      });
  }
  ast.traverseTopDown("Value(k)", function(match) {
      //p = match.k.getPos();
      //rv.push({pos: p, type: 'info', level:'info', message:'key:'+match.k.value});
  });
  //console.log(rv);
  callback(rv);
};

handler.onDocumentOpen = function(path, doc, oldPath, callback) {
  console.log("worker.onDocumentOpen", path, oldPath);
  callback();
};

handler.onDocumentClose = function(path, callback) {
  console.log("close", path);
  refs.dropReference(path);
  callback();
};

handler.moz_setReference = function(origpath, refpath, contents) {
    var refAst = null;
    if (contents) {
        try {
            refAst = parse(contents);
        }
        catch (e) {
            console.error(e);
        }
    }
    refs.setReference(origpath, refpath, refAst);
    console.log('moz_setReference', origpath, refpath,
                refAst ? refAst.length:'no ref ast');
};

});
