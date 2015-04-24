$(document).ready(function () {
    'use strict';

    var localizeElements = function localizeElements() {
        $('#one').localize('helloString');

        $('#two').localize({
            stringid: 'goodbyeString'
        });

        $('#three').localize({
            stringid: 'myNameIsString',
            name: 'John'
        });

        $('#four').localize({
            stringid: 'whoIsString',
            firstName: 'John',
            lastName: 'Doe'
        });

        $('#five').localize(['whoIsString', 'John', 'Doe']);
    };

    localizeElements();

    $('#german-button').click(function () {
        $('body').localize('de_DE');
        localizeElements();
    });

    $('#italian-button').click(function () {
        $('body').localize('it_IT');
        localizeElements();
    });

    $('#english-button').click(function () {
        $('body').localize('en_US');
        localizeElements();
    });

    $('body').on('changeLocale', function (event, locale) {
        $('body').localize(locale);
        localizeElements();
    });
});
