const path = require('path');
const fs = require('fs');
const vm = require('vm');

function Module(id = '', parent) {
  this.id = id;
  this.path = path.dirname(id);
  this.exports = {};
  this.filename = null;
  this.loaded = false;
}

Module._extensions = Object.create(null);

Module.prototype.require = MyRequire = (id) => {
  return Module._load(id, this, /* isMain */ false);
}

Module._load = function (request, parent, isMain) {
  const filename = Module._resolveFilename(request, parent, isMain);
  const module = new Module(filename, parent);
  module.load(filename);
  return module.exports;
}

Module._resolveFilename = function (request, parent, isMain) {
  return path.resolve(__dirname, request);
}

Module.prototype.load = function (filename) {
  const extension = path.extname(filename);
  Module._extensions[extension](this, filename);
  this.loaded = true;
}

Module._extensions['.json'] = function (module, filename) {
  const content = fs.readFileSync(filename, 'utf8');
  module.exports = JSON.parse(content);
};
Module._extensions['.js'] = function (module, filename) {
  const content = fs.readFileSync(filename, 'utf8');
  module._compile(content, filename);
};

Module.prototype._compile = function (content, filename) {
  let functionStr = wrap(content);
  let fn = vm.runInThisContext(functionStr);
  const dirname = path.dirname(filename);
  const exports = this.exports;
  const require = this.require;
  const module = this;
  const thisValue = exports;
  fn.call(thisValue, exports, require, module, filename, dirname);
}

let wrap = function (script) {
  return Module.wrapper[0] + script + Module.wrapper[1];
};

Module.wrapper = [
  '(function (exports, require, module, __filename, __dirname) { ',
  '\n});'
];

/* test */
const {sum} = MyRequire('./test.js');
console.log(sum(1, 2));
const {name, version} = MyRequire('./test.json');
console.log(name, version);
