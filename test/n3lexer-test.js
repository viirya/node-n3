var N3Lexer = require('../lib/n3lexer.js');
var vows = require('vows'),
    chai = require('chai'),
    expect = chai.expect,
    events = require('events'),
    Readable = require('stream').Readable;
chai.should();
chai.use(require('chai-things'));

vows.describe('N3Lexer').addBatch({
  'The N3Lexer module': {
    topic: function () { return N3Lexer; },

    'should be a function': function (N3Lexer) {
      N3Lexer.should.be.a('function');
    },

    'should make N3Lexer objects': function (N3Lexer) {
      N3Lexer().constructor.should.eql(N3Lexer);
      N3Lexer().should.be.an.instanceof(N3Lexer);
    },

    'should be an N3Lexer constructor': function (N3Lexer) {
      new N3Lexer().constructor.should.eql(N3Lexer);
      new N3Lexer().should.be.an.instanceof(N3Lexer);
    },
  },

  'An N3Lexer instance': {
    'should tokenize the empty string':
      shouldTokenize(streamOf('')),

    'should tokenize a whitespace string':
      shouldTokenize(streamOf(' \t \n  ')),

    'should tokenize an explicituri':
      shouldTokenize(streamOf('<http://ex.org/?bla#foo>'),
                     { type: 'explicituri', value: 'http://ex.org/?bla#foo', line: 1 }),

    'should tokenize an explicituri with four-digit unicode characters':
      shouldTokenize(streamOf('<http://a.example/\\u0073>'),
                     { type: 'explicituri', value: 'http://a.example/s', line: 1 }),

    'should tokenize an explicituri with eight-digit unicode characters':
      shouldTokenize(streamOf('<http://a.example/\\U00000073>'),
                     { type: 'explicituri', value: 'http://a.example/s', line: 1 }),

    'should tokenize two explicituris separated by whitespace':
      shouldTokenize(streamOf(' \n\t<http://ex.org/?bla#foo> \n\t<http://ex.org/?bla#bar> \n\t'),
                     { type: 'explicituri', value: 'http://ex.org/?bla#foo', line: 2 },
                     { type: 'explicituri', value: 'http://ex.org/?bla#bar', line: 3 }),

    'should tokenize a statement with explicituris':
      shouldTokenize(streamOf(' \n\t<http://ex.org/?bla#foo> \n\t<http://ex.org/?bla#bar> \n\t<http://ex.org/?bla#boo> .'),
                     { type: 'explicituri', value: 'http://ex.org/?bla#foo', line: 2 },
                     { type: 'explicituri', value: 'http://ex.org/?bla#bar', line: 3 },
                     { type: 'explicituri', value: 'http://ex.org/?bla#boo', line: 4 },
                     { type: 'dot', line: 4 }),

    'should correctly recognize different types of newlines':
      shouldTokenize(streamOf('<a>\r<b>\n<c>\r\n.'),
                     { type: 'explicituri', value: 'a', line: 1 },
                     { type: 'explicituri', value: 'b', line: 2 },
                     { type: 'explicituri', value: 'c', line: 3 },
                     { type: 'dot', line: 4 }),

    'should ignore comments':
      shouldTokenize(streamOf('<#foo> #comment\n <#foo>  #comment \r# comment\n\n<#bla>#'),
                     { type: 'explicituri', value: '#foo', line: 1 },
                     { type: 'explicituri', value: '#foo', line: 2 },
                     { type: 'explicituri', value: '#bla', line: 5 }),

    'should tokenize a quoted string literal':
      shouldTokenize(streamOf('"string" '),
                     { type: 'literal', value: '"string"', line: 1 }),

    'should tokenize a triple quoted string literal':
      shouldTokenize(streamOf('"""string"""'),
                     { type: 'literal', value: '"string"', line: 1 }),

    'should tokenize a triple quoted string literal with quotes newlines inside':
      shouldTokenize(streamOf('"""st"r\ni""ng"""'),
                     { type: 'literal', value: '"st"r\ni""ng"', line: 1 }),

    'should tokenize a string with escape characters':
      shouldTokenize(streamOf('"\\\\ \\\' \\" \\n \\r \\t \\ua1b2" \n """\\\\ \\\' \\" \\n \\r \\t \\U0000a1b2"""'),
                     { type: 'literal', value: '"\\ \' " \n \r \t \ua1b2"', line: 1 },
                     { type: 'literal', value: '"\\ \' " \n \r \t \ua1b2"', line: 2 }),

    'should tokenize a quoted string literal with language code':
      shouldTokenize(streamOf('"string"@en "string"@nl-be "string"@EN '),
                     { type: 'literal', value: '"string"', line: 1 },
                     { type: 'langcode', value: 'en', line: 1 },
                     { type: 'literal', value: '"string"', line: 1 },
                     { type: 'langcode', value: 'nl-be', line: 1 },
                     { type: 'literal', value: '"string"', line: 1 },
                     { type: 'langcode', value: 'EN', line: 1 }),

    'should tokenize a quoted string literal with type':
      shouldTokenize(streamOf('"stringA"^^<type> "stringB"^^ns:mytype '),
                     { type: 'literal', value: '"stringA"', line: 1 },
                     { type: 'type', value: 'type', line: 1 },
                     { type: 'literal', value: '"stringB"', line: 1 },
                     { type: 'type', value: 'mytype', prefix: 'ns', line: 1 }),

    'should tokenize a single-quoted string literal':
      shouldTokenize(streamOf("'string' "),
                     { type: 'literal', value: '"string"', line: 1 }),

    'should tokenize a triple single-quoted string literal':
      shouldTokenize(streamOf("'''string'''"),
                     { type: 'literal', value: '"string"', line: 1 }),

    'should tokenize a triple single-quoted string literal with quotes newlines inside':
      shouldTokenize(streamOf("'''st'r\ni''ng'''"),
                     { type: 'literal', value: '"st\'r\ni\'\'ng"', line: 1 }),

    'should tokenize a single-quoted string with escape characters':
      shouldTokenize(streamOf("'\\\\ \\\" \\' \\n \\r \\t \\ua1b2' \n '''\\\\ \\\" \\' \\n \\r \\t \\U0000a1b2'''"),
                     { type: 'literal', value: '"\\ " \' \n \r \t \ua1b2"', line: 1 },
                     { type: 'literal', value: '"\\ " \' \n \r \t \ua1b2"', line: 2 }),

    'should tokenize a single-quoted string literal with language code':
      shouldTokenize(streamOf("'string'@en 'string'@nl-be 'string'@EN "),
                     { type: 'literal', value: '"string"', line: 1 },
                     { type: 'langcode', value: 'en', line: 1 },
                     { type: 'literal', value: '"string"', line: 1 },
                     { type: 'langcode', value: 'nl-be', line: 1 },
                     { type: 'literal', value: '"string"', line: 1 },
                     { type: 'langcode', value: 'EN', line: 1 }),

    'should tokenize a single-quoted string literal with type':
      shouldTokenize(streamOf("'stringA'^^<type> 'stringB'^^ns:mytype "),
                     { type: 'literal', value: '"stringA"', line: 1 },
                     { type: 'type', value: 'type', line: 1 },
                     { type: 'literal', value: '"stringB"', line: 1 },
                     { type: 'type', value: 'mytype', prefix: 'ns', line: 1 }),

    'should tokenize an integer literal':
      shouldTokenize(streamOf('10, +20. -30, 40. '),
                     { type: 'literal', value: '"10"^^<http://www.w3.org/2001/XMLSchema#integer>', line: 1 },
                     { type: 'comma', line: 1 },
                     { type: 'literal', value: '"+20"^^<http://www.w3.org/2001/XMLSchema#integer>', line: 1 },
                     { type: 'dot', line: 1 },
                     { type: 'literal', value: '"-30"^^<http://www.w3.org/2001/XMLSchema#integer>', line: 1 },
                     { type: 'comma', line: 1 },
                     { type: 'literal', value: '"40"^^<http://www.w3.org/2001/XMLSchema#integer>', line: 1 },
                     { type: 'dot', line: 1 }),

    'should tokenize a decimal literal':
      shouldTokenize(streamOf('1. 2.0, .3. -0.4, -.5. '),
                     { type: 'literal', value: '"1"^^<http://www.w3.org/2001/XMLSchema#integer>', line: 1 },
                     { type: 'dot', line: 1 },
                     { type: 'literal', value: '"2.0"^^<http://www.w3.org/2001/XMLSchema#decimal>', line: 1 },
                     { type: 'comma', line: 1 },
                     { type: 'literal', value: '".3"^^<http://www.w3.org/2001/XMLSchema#decimal>', line: 1 },
                     { type: 'dot', line: 1 },
                     { type: 'literal', value: '"-0.4"^^<http://www.w3.org/2001/XMLSchema#decimal>', line: 1 },
                     { type: 'comma', line: 1 },
                     { type: 'literal', value: '"-.5"^^<http://www.w3.org/2001/XMLSchema#decimal>', line: 1 },
                     { type: 'dot', line: 1 }),

    'should tokenize a double literal':
      shouldTokenize(streamOf('10e20, +30.40E+50. -60.70e-80. '),
                     { type: 'literal', value: '"10e20"^^<http://www.w3.org/2001/XMLSchema#double>', line: 1 },
                     { type: 'comma', line: 1},
                     { type: 'literal', value: '"+30.40E+50"^^<http://www.w3.org/2001/XMLSchema#double>', line: 1 },
                     { type: 'dot', line: 1},
                     { type: 'literal', value: '"-60.70e-80"^^<http://www.w3.org/2001/XMLSchema#double>', line: 1 },
                     { type: 'dot', line: 1 }),

    'should tokenize booleans':
      shouldTokenize(streamOf('true false '),
                     { type: 'literal', value: '"true"^^<http://www.w3.org/2001/XMLSchema#boolean>', line: 1 },
                     { type: 'literal', value: '"false"^^<http://www.w3.org/2001/XMLSchema#boolean>', line: 1 }),

    'should tokenize statements with shared subjects':
      shouldTokenize(streamOf('<a> <b> <c>;\n<d> <e>.'),
                     { type: 'explicituri', value: 'a', line: 1 },
                     { type: 'explicituri', value: 'b', line: 1 },
                     { type: 'explicituri', value: 'c', line: 1 },
                     { type: 'semicolon', line: 1 },
                     { type: 'explicituri', value: 'd', line: 2 },
                     { type: 'explicituri', value: 'e', line: 2 },
                     { type: 'dot', line: 2 }),

    'should tokenize statements with shared subjects and predicates':
      shouldTokenize(streamOf('<a> <b> <c>,\n<d>.'),
                     { type: 'explicituri', value: 'a', line: 1 },
                     { type: 'explicituri', value: 'b', line: 1 },
                     { type: 'explicituri', value: 'c', line: 1 },
                     { type: 'comma', line: 1 },
                     { type: 'explicituri', value: 'd', line: 2 },
                     { type: 'dot', line: 2 }),

    'should tokenize statements with shared subjects and predicates and qnames':
      shouldTokenize(streamOf('a:a b:b c:c;d:d e:e,f:f.'),
                     { type: 'qname', prefix: 'a', value: 'a', line: 1 },
                     { type: 'qname', prefix: 'b', value: 'b', line: 1 },
                     { type: 'qname', prefix: 'c', value: 'c', line: 1 },
                     { type: 'semicolon', line: 1 },
                     { type: 'qname', prefix: 'd', value: 'd', line: 1 },
                     { type: 'qname', prefix: 'e', value: 'e', line: 1 },
                     { type: 'comma', line: 1 },
                     { type: 'qname', prefix: 'f', value: 'f', line: 1 },
                     { type: 'dot', line: 1 }),

    'should tokenize the colon qname':
      shouldTokenize(streamOf(': : :.'),
                     { type: 'qname', prefix: '', value: '', line: 1 },
                     { type: 'qname', prefix: '', value: '', line: 1 },
                     { type: 'qname', prefix: '', value: '', line: 1 },
                     { type: 'dot', line: 1 }),

    'should tokenize a chunked stream':
      shouldTokenize(streamOf('<a>\n<b', '> ', '"""', 'c\n', '"""', '.',
                              '<d> <e', '> ', '""', '.',
                              '<g> <h> "i"', '@e', 'n.'),
                     { type: 'explicituri', value: 'a', line: 1 },
                     { type: 'explicituri', value: 'b', line: 2 },
                     { type: 'literal', value: '"c\n"', line: 2 },
                     { type: 'dot', line: 3 },
                     { type: 'explicituri', value: 'd', line: 3 },
                     { type: 'explicituri', value: 'e', line: 3 },
                     { type: 'literal', value: '""', line: 3 },
                     { type: 'dot', line: 3 },
                     { type: 'explicituri', value: 'g', line: 3 },
                     { type: 'explicituri', value: 'h', line: 3 },
                     { type: 'literal', value: '"i"', line: 3 },
                     { type: 'langcode', value: 'en', line: 3 },
                     { type: 'dot', line: 3 }),

    'should tokenize @prefix declarations':
      shouldTokenize(streamOf('@prefix : <http://uri.org/#>.\n@prefix abc: <http://uri.org/#>.'),
                     { type: '@prefix', line: 1 },
                     { type: 'prefix', value: '', line: 1 },
                     { type: 'explicituri', value: 'http://uri.org/#', line: 1 },
                     { type: 'dot', line: 1 },
                     { type: '@prefix', line: 2 },
                     { type: 'prefix', value: 'abc', line: 2 },
                     { type: 'explicituri', value: 'http://uri.org/#', line: 2 },
                     { type: 'dot', line: 2 }),

    'should tokenize @base declarations':
      shouldTokenize(streamOf('@base <http://uri.org/#>.\n@base <http://uri.org/#>.'),
                     { type: '@base', line: 1 },
                     { type: 'explicituri', value: 'http://uri.org/#', line: 1 },
                     { type: 'dot', line: 1 },
                     { type: '@base', line: 2 },
                     { type: 'explicituri', value: 'http://uri.org/#', line: 2 },
                     { type: 'dot', line: 2 }),

    'should tokenize PREFIX declarations':
      shouldTokenize(streamOf('PREFIX : <http://uri.org/#>\npreFiX abc: <http://uri.org/#>'),
                     { type: 'PREFIX', line: 1 },
                     { type: 'prefix', value: '', line: 1 },
                     { type: 'explicituri', value: 'http://uri.org/#', line: 1 },
                     { type: 'PREFIX', line: 2 },
                     { type: 'prefix', value: 'abc', line: 2 },
                     { type: 'explicituri', value: 'http://uri.org/#', line: 2 }),

    'should tokenize BASE declarations':
      shouldTokenize(streamOf('BASE <http://uri.org/#>\nbAsE <http://uri.org/#>'),
                     { type: 'BASE', line: 1 },
                     { type: 'explicituri', value: 'http://uri.org/#', line: 1 },
                     { type: 'BASE', line: 2 },
                     { type: 'explicituri', value: 'http://uri.org/#', line: 2 }),

    'should tokenize qnames':
      shouldTokenize(streamOf(':a b:c d-dd:e-ee.'),
                     { type: 'qname', prefix: '',      value: 'a',    line: 1 },
                     { type: 'qname', prefix: 'b',     value: 'c',    line: 1 },
                     { type: 'qname', prefix: 'd-dd',  value: 'e-ee', line: 1 },
                     { type: 'dot', line: 1 }),

    'should tokenize blank nodes':
      shouldTokenize(streamOf('[] [<a> <b>]'),
                     { type: 'bracketopen', line: 1 },
                     { type: 'bracketclose', line: 1 },
                     { type: 'bracketopen', line: 1 },
                     { type: 'explicituri', value: 'a', line: 1 },
                     { type: 'explicituri', value: 'b', line: 1 },
                     { type: 'bracketclose', line: 1 }),

    'should tokenize lists':
      shouldTokenize(streamOf('() (<a>) (<a> <b>)'),
                     { type: 'liststart', line: 1 },
                     { type: 'listend', line: 1 },
                     { type: 'liststart', line: 1 },
                     { type: 'explicituri', value: 'a', line: 1 },
                     { type: 'listend', line: 1 },
                     { type: 'liststart', line: 1 },
                     { type: 'explicituri', value: 'a', line: 1 },
                     { type: 'explicituri', value: 'b', line: 1 },
                     { type: 'listend', line: 1 }),

    'should tokenize mixed lists':
      shouldTokenize(streamOf('<a> <b> (1 "2" :o)'),
                     { type: 'explicituri', value: 'a', line: 1 },
                     { type: 'explicituri', value: 'b', line: 1 },
                     { type: 'liststart', line: 1 },
                     { type: 'literal', value: '"1"^^<http://www.w3.org/2001/XMLSchema#integer>', line: 1 },
                     { type: 'literal', value: '"2"', line: 1 },
                     { type: 'qname', value: 'o', line: 1 },
                     { type: 'listend', line: 1 }),

    'should tokenize the "a" predicate':
      shouldTokenize(streamOf('<x> a <y>.'),
                     { type: 'explicituri', value: 'x', line: 1 },
                     { type: 'abbreviation', value: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type', line: 1 },
                     { type: 'explicituri', value: 'y', line: 1 },
                     { type: 'dot', line: 1 }),

    'should not tokenize an invalid document':
      shouldNotTokenize(streamOf(' \n @!'), new Error('Syntax error: unexpected "@!" on line 2.'))
  }
}).export(module);

function shouldTokenize(stream, expected) {
  var result = [];
  expected = Array.prototype.slice.call(arguments, 1);

  function onToken(token) {
    expect(token).to.exist;
    // remove non-specified attributes on token, to avoid exhaustive token specification above
    var expectedItem = expected[result.length];
    if (expectedItem)
      for (var attribute in token)
        if (token[attribute] === '' && expectedItem[attribute] !== '')
          delete token[attribute];
    result.push(token);
  }

  return {
    topic: function () {
      var lexer = new N3Lexer();
      stream.pipe(lexer);
      lexer.on('data', onToken);
      lexer.on('error', this.callback.bind(this));
      lexer.on('end',   this.callback.bind(this, null, result));
    },

    'should equal the expected value': function (result) {
      result.should.eql(expected);
    }
  };
}

function shouldNotTokenize(stream, expectedError) {
  return {
    topic: function () {
      var lexer = new N3Lexer();
      stream.pipe(lexer);
      lexer.on('error', this.callback.bind(this, null));
      lexer.on('error', lexer.removeAllListeners.bind(lexer, 'end'));
      lexer.on('end',   this.callback.bind(this, "Expected an error, but none was raised."));
      lexer.resume();
    },

    'should equal the expected message': function (error) {
      expect(error).to.exist;
      error.should.eql(expectedError);
    }
  };
}

function streamOf() {
  var elements = Array.prototype.slice.call(arguments),
      stream = new Readable();

  stream._read = function () {
    this.push(elements.length ? elements.shift() : null);
  };

  return stream;
}
