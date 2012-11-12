/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define(function(require, exports, module) {
  function Tree() {
    this.children = [];
    this.setData = function(path, data) {
      var segs = path.split('/').filter(function(seg) {return seg && (seg != '.')});
      this._setData(segs, data);
    };
    this.compact = function() {
      this.children.forEach(function(tpl) {
        var leaf = tpl[0], child = tpl[1];
        while (child.children && child.children.length == 1) {
          leaf += '/' + child.children[0][0];
          child = child.children[0][1];
        }
        tpl[0] = leaf;
        tpl[1] = child;
        if (child.compact) child.compact();
      });
    };
    this._setData = function(segs, data) {
      if (segs.length == 0) {
        console.error('unexpected');
        return;
      }
      var leaf = segs[0], c, cc;
      if (segs.length == 1) {
        this.children.push([leaf, data]);
        return;
      }
      for (c=0, cc=this.children.length; c<cc; ++c) {
        if (this.children[c][0] == leaf) break;
      }
      if (c==cc) {
        this.children.push([leaf, new Tree()]);
      }
      this.children[c][1]._setData(segs.slice(1), data);
    }
  };
  module.exports = Tree
});
