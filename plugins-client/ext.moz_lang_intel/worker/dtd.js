define("ext/moz_lang_intel/worker/dtd", ["require", "exports", "module"], function(require, exports, module) {
/*global main*/

var baseLanguageHandler = require('ext/language/base_handler');
var tree = require('treehugger/tree');
var addParentPointers = require('treehugger/traverse').addParentPointers;
var parse = require('ext/moz_lang_intel/parser/dtd');
var refs = require('ext/moz_lang_intel/worker/refcache');

var handler = module.exports = Object.create(baseLanguageHandler);

handler.handlesLanguage = function(language) {
  var handles = language === 'dtd';
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
    console.log('*dtd complete*', this.path);
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
  console.log('*dtd worker analyzing*:', this.path);
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
