/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * This extension extends the language support with l10n tools.
 * It's creating autocompletion for missing entries, etc.
 */

define(function(require, exports, module) {
    /*global barTools*/

    var ide = require("core/ide");
    var ext = require("core/ext");
    var settings = require("core/settings");
    var filesystem = require("ext/filesystem/filesystem");
    var language = require("ext/language/language");
    var properties_parser = require("text!ext/moz_lang_intel/parser/properties.js");
    var properties_worker = require("text!ext/moz_lang_intel/worker/properties.js");
    var dtd_parser = require("text!ext/moz_lang_intel/parser/dtd.js");
    var dtd_worker = require("text!ext/moz_lang_intel/worker/dtd.js");

    module.exports = ext.register("ext/moz_lang_intel/moz_lang_intel", {
        dev: "mozilla.org",
        name: "LanguageTools",
        alone: true,
        type: ext.GENERAL,
        deps: [],
        nodes: [],

        init: function(amlNode) {
            var self = this;

            function onSettings(e) {
                self.locale = e.locale;
                self.ini = e.ini;
                self.l10nbase = e.l10nbase;
                console.log('onIntelSettings', e.name, self.locale);
                if (self.l10nbase) {
                    var en_segs = self.ini.split('/');
                    var en_base = en_segs.slice(0, en_segs.indexOf('locales') - 1).join('/');
                    var l10nsegs = self.l10nbase.split('/');
                    if (l10nsegs[0] === '.') l10nsegs.shift();
                    l10nsegs.push(self.locale);
                    var l10nbase = l10nsegs.join('/');
                    self.getRefPath = function(origpath){
                        if (origpath.substr(0, 2) === './')
                            origpath = origpath.substr(2);
                        // XXX, hack, only one hierarchy now
                        if (origpath.indexOf(l10nbase) !== 0) {
                            console.log('fail');
                            return origpath;
                        }
                        var path = origpath.substr(l10nbase.length + 1);
                        var segs = path.split('/');
                        var mod = segs.shift();
                        console.log(en_base, mod, segs);
                        return [en_base, mod, 'locales/en-US'].concat(segs).join('/');
                    };
                }
                else {
                    var leadloc = new RegExp('^' + self.locale + '/');
                    self.getRefPath = function(origpath) {
                        return origpath.replace(leadloc, 'en-US/');
                    };
                }
            }
            ide.addEventListener("moz:settings", onSettings);
            // get the code into the worker, we'll register additional types later
            language.registerLanguageHandler("ext/moz_lang_intel/worker/properties",
                properties_parser + properties_worker + 
                dtd_parser + dtd_worker);
            ide.addEventListener("extload", function() {
                console.log('worker?', language.worker);
                var _onmessage = language.worker.onMessage;
                // delay registering additional handlers post-extload,
                // to make sure their code is landed.
                setTimeout(function() {language.registerLanguageHandler("ext/moz_lang_intel/worker/dtd")}, 0);
                language.worker.$worker.onmessage = function(e) {
                    _onmessage(e);
                    if (e.data.type == 'moz:l10n' && e.data.name == 'reference') {
                        var origpath = e.data.data.path;
                        var refpath = self.getRefPath(origpath);
                        console.log('moz_lang_intel onmessage:', origpath, refpath);
                        if (origpath != refpath) {
                            filesystem.readFile(ide.davPrefix + '/' + refpath,

                            function(content, rv) {
                                language.worker.call("moz_setReference", [origpath, refpath, content]);
                            });
                        }
                        else {
                            language.worker.call("moz_setReference", [origpath, refpath, null]);
                        }
                    }
                };
            });
        },

        hook: function() {
            ext.initExtension(this);
        },

        enable: function() {
            this.nodes.each(function(item) {
                item.enable();
            });
        },

        disable: function() {
            this.nodes.each(function(item) {
                item.disable();
            });
        },

        destroy: function() {
            this.nodes.each(function(item) {
                item.destroy(true, true);
            });
            this.nodes = [];
        }
    });

});
