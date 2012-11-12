/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var Diff_Match_Patch = require("../cloud9.ide.revisions/diff_match_patch");
var Diff = new Diff_Match_Patch();

define(function(require, exports, module) {
  exports.filediffs = function(ref, l10n) {
        var reflines = ref.split('\n').filter(function(l){return l}),
            l10nlines = l10n.split('\n').filter(function(l){return l}),
            lines = {}, lineslist, i, ii;
        for (i=0, ii=reflines.length; i<ii; ++i) {
            lines['#' + reflines[i]] = true;
        }
        for (i=0, ii=l10nlines.length; i<ii; ++i) {
            lines['#' + l10nlines[i]] = true;
        }
        lineslist = Object.keys(lines).sort();
        lines = {};
        for (i=0, ii=lineslist.length; i<ii; ++i) {
            lines[lineslist[i]] = i;
        }
        var refstring = String.fromCharCode.apply({}, reflines.map(function(v){return lines['#' + v]})),
            l10nstring = String.fromCharCode.apply({}, l10nlines.map(function(v){return lines['#' + v]}));
        var diffs = Diff.diff_main(refstring, l10nstring);
        var labels = {'-1': 'missing', '0': 'compare', '1': 'obsolete'};
        return diffs.map(function(tpl) {
            var lns = tpl[1].split('').map(function(i){return lineslist[i.charCodeAt(0)].slice(1)});
            return [labels[tpl[0]], lns];
        });
    }
});
