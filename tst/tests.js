$(document).ready(function () {
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

    test('Plugin is chainable', function () {
        ok($('#one').localize().addClass('testing'), 'can be chained');
        equal($('#one').attr('class'), 'testing', 'class was added correctly from chaining');
    });

    test('Localize in English', function () {
        $('body').localize('en_US');
        localizeElements();
        ok($('#one').html(), 'Hello');
        ok($('#two').html(), 'Goodbye');
        ok($('#three').html(), 'My name is John');
        ok($('#four').html(), 'Who is John Doe?');
        ok($('#five').html(), 'Who is John Doe?');
    });

    test('Localize in German', function () {
        $('body').localize('de_DE');
        localizeElements();
        ok($('#one').html(), 'Hallo');
        ok($('#two').html(), 'Auf Wiedersein');
        ok($('#three').html(), 'Ich heisse John');
        ok($('#four').html(), 'Wer ist John Doe?');
        ok($('#five').html(), 'Wer ist John Doe?');
    });

    test('Localize in Italian', function () {
        $('body').localize('it_IT');
        localizeElements();
        ok($('#one').html(), 'Ciao');
        ok($('#two').html(), 'Addio');
        ok($('#three').html(), 'Il mio nome e John');
        ok($('#four').html(), 'Che e John Doe?');
        ok($('#five').html(), 'Che e John Doe?');
    });
});
