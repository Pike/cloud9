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
                var setLocale = settings.model.queryValue("moz/project/@locale") || null;
                if (setLocale && setLocale != self.locale) {
                    self.locale = setLocale;
                    console.log('onSettings', e.name, self.locale);
                    // maybe do something
                }
            }
            ide.addEventListener("settings.load", onSettings);
            ide.addEventListener("settings.save", onSettings);
            language.registerLanguageHandler("ext/moz_lang_intel/worker/properties",
            properties_parser + properties_worker);
            ide.addEventListener("extload", function() {
                console.log('worker?', language.worker);
                var _onmessage = language.worker.onMessage;
                language.worker.$worker.onmessage = function(e) {
                    _onmessage(e);
                    if (e.data.type == 'moz:l10n' && e.data.name == 'reference') {
                        var origpath = e.data.data.path;
                        var refpath = origpath.replace(new RegExp('^' + self.locale + '/'), 'en-US/');
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
