/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define(function(require, exports, module) {
    exports.updateModel = function updateModel(model, locale, details) {
      function node(bp, dict) {
        var children = [], i, ii;
        var sub, missing = 0, obsolete = 0, xml, rv;
        if (dict.children) {
          for (i=0, ii=dict.children.length; i < ii; ++i) {
            sub = node(dict.children[i][0], dict.children[i][1]);
            missing += +sub.getAttribute('missing');
            obsolete += +sub.getAttribute('obsolete');
            children.push(sub);
          }
        }
        if (dict.value) {
          xml = '<file ';
          if (dict.value.missingEntity) {
            xml += 'missing="' + dict.value.missingEntity.length + '" ';
          }
          if (dict.value.obsoleteEntity) {
            xml += 'obsolete="' + dict.value.obsoleteEntity.length + '" ';
          }
          if (dict.value.missingFile) {
            xml += 'missingFile="yes" ';
            if (dict.value.strings) {
              xml += 'missing="' + dict.value.strings + '" ';
            }
          }
          xml += 'icon="page_white.png" ';
        }
        else {
          xml = '<dir icon="folder.png" ';
        }
        xml += 'path="' + bp + '">';
        if (dict.value) {
          xml += '</file>';
        }
        else {
          xml += '</dir>';
        }
        rv = apf.getXml(xml);
        for (i=0, ii=children.length; i < ii; ++i) {
          rv.appendChild(children[i]);
        }
        return rv;
      }
      model.load('<data></data>');
      if (details) {
          model.appendXml(node(locale, details));
      }
    };
});
