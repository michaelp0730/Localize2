/** @author Michael Pellegrini (pellegm@) */

/** @type {object} */
var LocaleCache = {
    locale: '',
    strings: {},
    loadStringsDeferred: $.Deferred()
};

$(document).ready(function () {
    (function ($, doc, win) {
        'use strict';

        /** @type {string} */
        var name = 'localize-plugin';

        /** @type {object} */
        var defaults = $('body').data('localize');

        /**
         * @type {object}
         * @description Will be used to hold the deferred object that gets returned from loadStrings()
         */
        var dfd;

        /** @type {string|Object|Array} */
        var params;

        if (validateLocale(defaults.locale)) {
            dfd = loadStrings(defaults.locale);
        } else {
            dfd = loadStrings('en_US'); // if an invalid locale is passed, default to en_US
            (defaults.debug) ? console.error('Locale "' + defaults.locale + '" is invalid. Defaulting to en_US.') : '';
        }

        /**
         * @param {string} locale - The locale of the JSON file to load
         * @returns {object} jqDeferred - In legacySupport mode, we return the jqDeferred promise. Otherwise we resolve
         * jqDeferred and resolve LocaleCache.loadStringsDeferred
         */
        function loadStrings(locale) {
            /**
             * @type {object}
             * @description Deferred object used in .localize() jQuery function
             */
            var jqDeferred = $.Deferred();

            /** @type {string} */
            var endpoint = (defaults.loadFromAPI) ? defaults.apiPath : defaults.localPath + locale + '.json';

            var request, timeout, jsonResponse;

            // if we need to support hand scanners running old versions of IE
            if (defaults.legacySupport) {
                request = (window.XMLHttpRequest) ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
                timeout = (defaults.timeoutInMills) ? defaults.timeoutInMills : 50;
                request.open('GET', endpoint, true);
                request.onreadystatechange = function () {
                    /**
                     * @description Prevent IE alert from showing on readyState 2 & 3. Default timeout length is 50ms,
                     * but this setting can be overridden in data-localize on <body>
                     */
                    setTimeout(function () {
                        if (request.status === 200) { // successful request
                            if (request.readyState === 4) { // data is ready
                                jsonResponse = $.parseJSON(request.responseText);
                                LocaleCache.locale = locale;
                                LocaleCache.strings = jsonResponse;
                                jqDeferred.resolve(jsonResponse);
                            }
                        } else { // unsuccessful request
                            jqDeferred.reject("HTTP error: " + request.status);
                        }
                    }, timeout);
                };
                request.send();
                return jqDeferred.promise();
            } else {
                return $.ajax({
                    url: endpoint,
                    type: 'GET',
                    dataType: 'json',
                    cache: true, // allows the browser to load pre-loaded files from cache rather than make a new request
                    success: function (data) {
                        LocaleCache.locale = locale;
                        LocaleCache.strings = data;
                        LocaleCache.loadStringsDeferred.resolve(data);
                        jqDeferred.resolve(data);
                        (defaults.debug) ? console.log('Strings loaded for locale: ' + locale) : '';
                    },
                    error: function () {
                        LocaleCache.loadStringsDeferred.reject();
                        jqDeferred.reject();
                        (defaults.debug) ? console.error('Could not load localization file: ' + endpoint) : '';
                    }
                });
            }
        }

        /**
         * @param {string} locale
         * @returns {boolean}
         * @description Loops through defaults.validLocales to see if it includes the locale paramater that was passed
         */
        function validateLocale(locale) {
            for (var i = 0; i <= defaults.validLocales.length; i++) {
                if (locale === defaults.validLocales[i]) {
                    return true;
                }
            }
            return false;
        }

        /**
         * @constructor
         * @param {string} DOM element
         */
        function Localize(el) {
            this.$el = $(el);
            this.$el.data(name, this); // store a reference to the plugin on our DOM element

            /**
             * @description This RegEx searches for text located within %{ }. It expects to find '%{' first, followed by
             * a character class of at least one character that is not '}'. It then expects the final character to be a '}'.
             * @example "My name is %{name}" Searches for %{name}
             */
            var matchRegEx = new RegExp('\%\{([^}]+)\}', 'g');
            var stringId, args;

            if (this.$el.prop('tagName') === 'BODY') { // if .localize() is called from body
                if (params && typeof(params) === 'string') {
                    if (validateLocale(params)) {
                        defaults.locale = params;
                        dfd = loadStrings(defaults.locale);
                    } else {
                        dfd = loadStrings('en_US'); // if an invalid locale is passed, default to en_US
                        (defaults.debug) ? console.error('Locale "' + params + '" is invalid. Defaulting to en_US.') : '';
                    }
                } else {
                    (defaults.debug) ? console.error('Incorrect parameters provided to body.localize(). Locale string expected.') : '';
                }
                return;
            }

            /*
             * All references to the data-stringid property are intentionally lowercase per the HTML5 data attributes spec.
             * All JavaScript variables referencing stringId are camel cased.
             */

            if (Object.prototype.toString.call(params) === '[object Array]') { // params are an Array
                stringId = params[0]; // First item in array should be the string ID
                this.$el.data('stringid', stringId);
                params.shift();
                this.$el.data('args', params);
                args = params;
            } else if (typeof(params) === 'object') { // params is an object
                if (params.hasOwnProperty('stringid')) {
                    stringId = params.stringid;
                    this.$el.data('stringid', stringId);
                    delete params.stringid;
                    this.$el.data('args', params);
                    args = params;
                } else { // no string ID was included on the params object
                    (defaults.debug) ? console.error('Missing String ID') : '';
                }
            } else if (typeof(params) === 'string') { // params is a string
                stringId = params;
                this.$el.data('stringid', stringId);
            }

            /**
             * @param {object} - An object consisting of strings returned from loadStrings()
             */
            dfd.then(function (strings) {
                if (strings[stringId]) {
                    if (args !== undefined) {
                        if (Object.prototype.toString.call(args) === '[object Array]') { // args is an array
                            var index = 0;
                            strings[stringId] = strings[stringId].replace(matchRegEx, function () {
                                var replacement = args[index];
                                index++;
                                return replacement;
                            });
                        } else if (typeof(args) === 'object') { // args is an object
                            strings[stringId] = strings[stringId].replace(matchRegEx, function (match, replacement) {
                                return args[replacement];
                            });
                        } else {
                            (defaults.debug) ? console.error('Invalid data type in data-args. Must be an object or an array.') : '';
                        }
                    }
                    $(el).html(strings[stringId]);
                } else { // string wasn't found
                    if (defaults.debug) {
                        $(el).html('[NO TRANSLATION] for ' + stringId);
                        console.error('No translation found for string "' + stringId +'"');
                    }
                }
            });
        }

        /**
         * @description Allows you to unsubscribe your DOM element from this plugin without destroying the DOM element.
         * @example $('#my-element').data('localize-plugin').unsubscribe();
         */
        Localize.prototype.unsubscribe = function () { // keeping function anonymous so we don't cause a memory leak in IE
            this.$el.off('.' + name); // remove event handler
            this.$el.find('*').off('.' + name); // remove event handler
            this.$el.removeData(name);
            this.$el = null;
        };

        /**
         * @description Polymorphic function that can take either a string, an object, or an array as a parameter
         * @param {String|Object|Array} String ID with optional values if the string contains placeholders
         */
        $.fn.localize = function (opts) {
            params = opts;
            /**
             * @description Attach the .localize() method to the jQuery namespace and allow it to be chainable.
             */
            return this.each(function () {
                new Localize(this);
            });
        }
    })(jQuery, document, window);
});
