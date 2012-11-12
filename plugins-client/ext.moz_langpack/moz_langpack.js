/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This extension builds language packs if files are saved,
 * and updates a button to download them.
 */

define(function(require, exports, module) {
/*global barTools*/

var ide = require("core/ide");
var ext = require("core/ext");
var fs = require("ext/filesystem/filesystem");
var menus = require("ext/menus/menus");

module.exports = ext.register("ext/moz_langpack/moz_langpack", {
  dev: "mozilla.org",
  name: "Language Pack Builder",
  alone: true,
  type: ext.GENERAL,
  deps: [fs],
  nodes: [],

  init : function(amlNode) {
    this.nodes.push(
      menus.$insertByIndex(barTools, new apf.button({
        skin : "c9-toolbarbutton-glossy",
        tooltip : "Install Language Pack",
        caption : "LangPack"
      })), 20);
  },

  hook : function() {
    var _self = this;
    ide.addEventListener("fs.afterfilesave", function (e) {
      if (e.success) {
        _self.maybeBuild();
      }
    });
    ext.initExtension(this);
  },

  enable : function() {
    this.nodes.each(function(item) {
        item.enable();
    });
  },

  disable : function() {
    this.nodes.each(function(item) {
        item.disable();
    });
  },

  destroy : function() {
    this.nodes.each(function(item) {
      item.destroy(true, true);
    });
    this.nodes = [];
  },
  
  maybeBuild : function() {
    var btn = this.nodes[0];
    console.log('I might want to do a langpack', btn);
    btn.setAttribute("caption", "Building...");
    setTimeout(function() {btn.setAttribute("caption", "LangPack");}, 2000);
  }
});

});