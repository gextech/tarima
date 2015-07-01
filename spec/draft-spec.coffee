tarima = require('../lib')

$ = (filename, params, code) ->
  [code, params] = [params, {}] if typeof params is 'string'
  tarima.parse filename, code, params

describe 'common behavior', ->
  it 'x.y has an empty pipe', ->
    expect($('x.y').params.parts).toEqual []

  it 'x.y.z has a pipe with one engine', ->
    expect($('x.y.z').params.parts).toEqual ['z']

  describe 'engines behavior', ->
    describe 'unknown' , ->
      it 'x.y.z should return as is', ->
        expect($('x.y.z', 'a').render()).toBe 'a'
        expect($('x.y.z', 'b').compile()).toBe 'b'

    describe 'known -- render()', ->
      it 'x.y.js should return as is', ->
        expect($('x.y.js', 'var x;').render()).toBe 'var x;'

      it 'x.js.hbs should return rendered Handlebars', ->
        expect($('x.js.hbs', 'x{{y}}').render(y: 'D')).toBe 'xD'

      it 'x.js.ejs should return rendered Embedded JavaScript', ->
        expect($('x.js.ejs', 'a<%=b%>').render(b: '!')).toBe 'a!'

      it 'x.js.coffee should return transpiled CoffeeScript', ->
        expect($('x.js.coffee', 'foo bar').render()).toContain 'foo(bar);'

      it 'x.js.ract should return a plain object (Ractive.js templating)', ->
        expect($('x.js.ract', '{{x}}').render()).toEqual { v: 3, t: [ { t: 2, r: 'x' } ] }

      it 'x.js.jade should return rendered Jade', ->
        expect($('x.js.jade', '|#[#{x}]').render(x: 'y')).toContain '<y></y>'

      it 'x.js.json should return parsed JSON', ->
        expect($('x.js.json', '{"x":"y"}').render()).toEqual { x: 'y' }

      it 'x.js.less should return rendered LESS', ->
        expect($('x.js.less', '*{&:_{x:@y}}').render(y: 'z')).toContain '''
          *:_ {
            x: z;
          }
        '''

      it 'x.js.md should fail, or not?', ->
        expect(-> $('x.js.md', '# OK').render()).toThrow()

      it 'x.json.ejs should return raw JSON', ->
        expect($('x.json.ejs', '{"x":"<%=y%>"}').render(y: 'D')).toBe '{"x":"D"}'

    describe 'known -- compile()', ->
      it 'x.js.hbs should return a pre-compiled Handlebars template', ->
        expect($('x.js.hbs', '{{#x}}y{{/x}}').compile(x: 1)).toContain 'Handlebars.template'

      it 'x.js.jade should return a pre-compiled Jade template', ->
        expect($('x.js.jade', 'x=y').compile(y: 'z')).toContain 'function template(locals)'

    describe 'mixed engines', ->
      describe 'x.litcoffee.hbs.ejs', ->
        tpl = '''
          # <%= title || 'Untitled' %>

          {{#option}}
              fun = ->
          {{/option}}{{^option}}
              class Klass; fun = new Klass
          {{/option}}
        '''

        view = $('x.litcoffee.hbs.ejs', tpl)

        it 'should return modified CoffeeScript calling render()', ->
          code = view.render(title: off)

          expect(code).toContain '# Untitled'
          expect(code).toContain 'class Klass'
          expect(code).not.toContain 'fun = ->'

        it 'should return a Handlebars template calling compile()', ->
          code = view.compile(title: 'OK')

          expect(code).toContain '# OK'
          expect(code).toContain 'fun = ->'
          expect(code).toContain 'class Klass'
          expect(code).toContain 'Handlebars.template'

      describe 'x.js.ract.jade.ejs', ->
        tpl = '''
          h1 <%= title || 'Untitled' %>

          |{{#option}}
          div I am a div
          |{{/option}}{{^option}}
          span I am a span
          |{{/option}}
        '''

        view = $('x.js.ract.jade.ejs', tpl)

        it 'should return a plain object calling render()', ->
          expect(view.render(title: off).v).toBe 3

        it 'should return a Ractive.js template calling compile()', ->
          code = view.compile(title: 'OK')

          expect(code).toContain '["OK"]'
          expect(code).toContain '"r":"option"'
          expect(code).toContain '"I am a span"'
          expect(code).toContain 'function anonymous()'

      describe 'x.y.js.coffee', ->
        it 'should return transpiled CoffeeScript calling render()', ->
          expect($('x.y.js.coffee', 'foo bar').render()).toContain 'foo(bar);'

        it 'should return transpiled CoffeeScript calling compile()', ->
          expect($('x.y.js.coffee', 'foo bar').compile()).toContain 'foo(bar);'
