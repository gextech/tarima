'use strict';

const fs = require('fs');
const path = require('path');

const merge = require('../../helpers/merge');
const parse = require('../../helpers/parse');
const render = require('../../helpers/render');
const support = require('../../support');

const reImport = /\bimport\s+(?:(.+?)\s+from\s+)?((['"])[^\2\s;]+\2)/g;
const reExport = /\bexport\s+((?:\w+\s+){1,3})/g;
const reScope = /___scope___\.file\("(.+?)"/g;

const reSplitAs = /\s+as\s+/;
const reProps = /(\w+)\s+as\s+(\w+)/g;
const reVars = /\s*,\s*/g;
const reCleanVars = /\{\s*\}/;

let inc = 0;
let fsbx;

function id(str, hide) {
  return (hide ? `$_${inc++}` : '') + str.split('/').pop().replace(/\.\w+|\W/g, '');
}

function refs(str, ref) {
  const props = str.match(reProps);
  const out = [];

  if (props) {
    props.forEach(x => {
      const parts = x.split(reSplitAs);

      out.push(`${parts[1]} = ${ref}.${parts[0]}`);
    });
  }

  const vars = str.replace(reProps, '')
    .replace(reCleanVars, '').split(reVars);

  vars.forEach(x => {
    if (x && x.indexOf('{') === -1 && x.indexOf('}') === -1) {
      out.push(`${x} = (${ref}.default || ${ref})`);
    } else if (id(x)) {
      out.push(`${id(x)} = ${ref}.${id(x)}`);
    }
  });

  return out;
}

function replaceImport(_, $1, $2) {
  if (!$1) {
    return `require(${$2})`;
  }

  if ($1.indexOf(',') === -1 && $1.indexOf(' as ') === -1) {
    if ($1.indexOf('{') === -1 && $1.indexOf('}') === -1) {
      return `var ${$1.replace('*', id($2))} = require(${$2})`;
    }

    return `var ${id($1)} = require(${$2}).${id($1)}`;
  }

  if ($1.indexOf('* as ') === -1) {
    const ref = id($2, true);

    return `var ${ref} = require(${$2}), ${refs($1, ref).join(', ')}`;
  }

  return `var ${$1.replace('* as ', '')} = require(${$2})`;
}

function replaceExport(_, words) {
  words = words.trim().split(/\s+/);

  let prefix = 'module.exports';

  if (words[0] === 'default') {
    prefix = `${prefix} = ${words.slice(1).join(' ')} `;
  } else {
    prefix += `.${words[0]} = ${words.slice(1).join(' ')} `;
  }

  return prefix;
}

module.exports = (options, params, done) => {
  /* eslint-disable import/no-unresolved */
  /* eslint-disable global-require */
  fsbx = fsbx || require('fuse-box');

  const baseDir = path.dirname(params.filename);
  const baseFile = path.basename(params.filename);

  const opts = merge({}, options['fuse-box'] || options.fusebox || {});
  const deps = [];

  function toArray(value) {
    if (Array.isArray(value)) {
      return value;
    }

    return value ? String(value).split(/\W/) : [];
  }

  toArray(params.data._external)
    .concat(toArray(opts.external))
    .forEach(dep => {
      deps.push(`+${dep}`);
    });

  const fuse = fsbx.FuseBox.init({
    log: true,
    debug: true,
    homeDir: baseDir,
    output: '/tmp/out.js',
    standalone: typeof opts.standalone === 'undefined' ? true : opts.standalone,
    plugins: [{
      test: support.getExtensions(true),
      init(context) {
        support.getExtensions().forEach(ext => {
          context.allowExtension(ext);
        });
      },
      transform(file) {
        file.loadContents();

        const sub = parse(file.info.absPath, file.contents.toString(), params.options);

        if (!sub.isScript && sub.parts[0] !== 'js') {
          sub.parts.unshift('js');
        }

        sub.isScript = true;
        sub._import = true;

        return new Promise((resolve, reject) => {
          render(sub, (err, result) => {
            if (err) {
              reject(err);
            } else {
              // rewrite import/export
              file.contents = result.source
                .replace(reImport, replaceImport)
                .replace(reExport, replaceExport);

              resolve(file.contents);
            }
          });
        });
      },
    }],
  });

  fuse.bundle(params.name)
  .instructions(`> ${baseFile} ${deps.join(' ')}`)
  .completed(result => {
    if (result.bundle) {
      result.bundle.producer.bundles.forEach(bundle => {
        params.source = fs.readFileSync(bundle.context.output.lastWrittenPath).toString()
          .replace(reScope, (_, $1) => {
            if ($1 !== baseFile) {
              // FIXME: this shouldn't be necessary?
              return `___scope___.file("${path.relative(baseDir, `/${$1}`)
                .replace(/\.\.\//g, '')}"`;
            }

            return _;
          });
        fs.unlinkSync(bundle.context.output.lastWrittenPath);
        done();
      });
    }
  });

  fuse.run();
};