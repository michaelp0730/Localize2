/*
 * LocaleCache is a globally available object used to store a reference to the current locale, as well as all
 * strings associated with that locale. Although it is not required by the .localize() plugin, it may provide
 * value to other plugins or APIs that need access to locale-related data.
 */
var LocaleCache = {
    locale: '',
    strings: {}
};

$(document).ready(function () {
    (function ($, doc, win) {
        'use strict';
        var name = 'localize-plugin'; // assign a name to use when storing a reference to the plugin
        var defaults = $('body').data('localize'); // properties taken from data-localize on body
        var dfd; // will be used to hold the deferred object that gets returned from loadStrings()
        var params; // used to handle parameters sent to .localize()

        if (validateLocale(defaults.locale)) {
            dfd = loadStrings(defaults.locale); // loadStrings returns a jQuery deferred object
        } else {
            (defaults.debug) ? console.error('Locale "' + defaults.locale + '" is invalid') : '';
        }

        /*
         * The loadStrings method creates a jQuery Deferred object, as well as an XMLHttpRequest object
         * (for newer browsers) or an ActiveXObject (for older versions of IE), then makes an AJAX
         * request based on the locale that was passed to it. The response from this request is then
         * parsed as JSON and used to resolve the Deferred object, as well as update the LocaleCache
         * object. Finally, we return dfd.promise(), which gets used in other methods of this plugin.
         */
        function loadStrings(locale) {
            var jqDeferred = $.Deferred();
            var endpoint = (defaults.loadFromAPI) ? defaults.apiPath : defaults.localPath + locale + '.json';
            var request = (window.XMLHttpRequest) ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
            var timeout = (defaults.timeoutInMills) ? defaults.timeoutInMills : 50;
            var jsonResponse;

            request.open('GET', endpoint, true);
            request.onreadystatechange = function () {
                // Setting a timeout to prevent IE alert from showing on readyState 2 & 3
                // The default timeout length is 50ms, but this setting can be overridden in data-localize on <body>
                setTimeout(function () {
                    if (request.status === 200) { // successful request
                        if (request.readyState === 4) { // data is ready
                            jsonResponse = $.parseJSON(request.responseText);
                            // Assign locale and strings to LocaleCache object
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
        }

        function validateLocale(locale) { // loops through defaults.validLocales array & looks for a match with the provided locale
            for (var i = 0; i <= defaults.validLocales.length; i++) {
                if (locale === defaults.validLocales[i]) {
                    return true;
                }
            }
        }

        function Localize(el) { // constructor method
            this.$el = $(el); // the DOM element the plugin is working with
            this.$el.data(name, this); // store a reference to the plugin on our DOM element

            /*
             * This regular expression searches for text located within %{ }. It expects to find '%{' first, followed by a character
             * class of at least one character that is not '}'. It then expects the final character to be a '}'. Passing 'g' tells
             * the regex to search globally and not stop when it finds its first match.
             *
             * Ex: "My name is %{name}" Searches for %{name}
             */
            var matchRegEx = new RegExp('\%\{([^}]+)\}', 'g');
            var stringId, args;

            if (this.$el.prop('tagName') === 'BODY') { // if .localize() is called from body
                if (params && typeof(params) === 'string') { // verify that params is a string
                    if (validateLocale(params)) { // validate params as a supported locale
                        defaults.locale = params;
                        dfd = loadStrings(defaults.locale);
                    } else {
                        (defaults.debug) ? console.error('Locale "' + params + '" is invalid') : '';
                    }
                } else {
                    (defaults.debug) ? console.error('Incorrect parameters provided to body.localize(). Locale string expected.') : '';
                }
                return;
            }

            /*
             * The purpose of this conditional block is to determine which type of parameters are being passed to .localize().
             * Valid parameter options are: Array, Object, or String. See the README for examples on how to pass parameters to
             * .localize(). In each case the value(s) of the parameters sent to .localize() are assigned to HTML data attributes on
             * the element calling .localize(). This is meant to provide support to other plugins or APIs that may need locale-
             * related data, but is not required for the .localize() plugin to function.
             *
             * All references to the data-stringid property are intentionally lowercase per the HTML5 data attributes spec.
             * All JavaScript variables referencing stringId are camel cased.
             */

            if (Object.prototype.toString.call(params) === '[object Array]') { // params are an Array
                this.$el.data('stringid', params[0]); // First item in array should be the string ID
                stringId = params[0];
                params.shift(); // remove the first item from the params array
                this.$el.data('args', params); // assign remaining array elements to data-args
                args = params;
            } else if (typeof(params) === 'object') { // params is an object
                if (params.hasOwnProperty('stringid')) { // verify that a string ID has been included
                    this.$el.data('stringid', params.stringid); // assign stringid to data-stringid
                    stringId = params.stringid;
                    delete params.stringid; // remove the stringid key/value from our parameters object
                    this.$el.data('args', params); // assign remaining properties to data-args
                    args = params;
                } else { // no string ID was included on the params object
                    (defaults.debug) ? console.error('Missing String ID') : '';
                }
            } else if (typeof(params) === 'string') { // params is a string
                this.$el.data('stringid', params); // assign the string to data-stringid on our DOM element
                stringId = params;
            }

            dfd.then(function (strings) { // use the deferred object to localize DOM elements
                if (strings[stringId]) { // check to verify that the string ID being called exists in the JSON.
                    if (args !== undefined) { // if data-args exists on our DOM element
                        if (Object.prototype.toString.call(args) === '[object Array]') { // args is an array
                            /*
                             * If data-args from the $el is an array, create a zero-based index, run the replace() method with our
                             * matchRegEx, replace the placeholder in the string based on the index value, increment the index, and
                             * return the replacement.
                             */
                            var index = 0;
                            strings[stringId] = strings[stringId].replace(matchRegEx, function () {
                                var replacement = args[index];
                                index++;
                                return replacement;
                            });
                        } else if (typeof(args) === 'object') { // args is an object
                            /*
                             * If data-args from the $el is an object, run a replace() using our matchRegEx, then return the new
                             * string with values from the object.
                             */
                            strings[stringId] = strings[stringId].replace(matchRegEx, function (match, replacement) {
                                return args[replacement];
                            });
                        } else {
                            (defaults.debug) ? console.error('Invalid data type in data-args. Must be an object or an array.') : '';
                        }
                    }
                    $(el).html(strings[stringId]); // inject the replaced string into the $el with .html()
                } else {
                    if (defaults.debug) {
                        // If the string isn't found and we're in debug mode, return '[NO TRANSLATION]'
                        $(el).html('[NO TRANSLATION] for ' + stringId);
                        console.error('No translation found for string "' + stringId +'"');
                    }
                }
            });
        }

        Localize.prototype.unsubscribe = function () { // keeping function anonymous so we don't cause a memory leak in IE
            /*
             * This method allows you to unsubscribe your DOM element from this plugin without destroying the DOM element. Here is
             * how you would invoke this method:
             * $('#my-element').data('localize-plugin').unsubscribe();
             */

            this.$el.off('.' + name); // remove event handler
            this.$el.find('*').off('.' + name); // remove event handler
            this.$el.removeData(name); // remove data
            this.$el = null; // set $el to null
        };

        $.fn.localize = function (opts) {
            params = opts;
            // Attach the .localize() method to the jQuery namespace and allow it to be chainable.
            return this.each(function () {
                new Localize(this);
            });
        }
    })(jQuery, document, window);
});