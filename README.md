> Tree shaking 是一个通常用于描述移除 JavaScript 上下文中的未引用代码(dead-code) 行为的术语。

[webpack tree-shaking官方文档](https://webpack.docschina.org/guides/tree-shaking/)

## 一、什么是Tree-Shaking
具体来说，在 webpack项目中，有一个入口文件，相当于一棵树的主干，入口文件有很多依赖的模块，相当于树枝。实际情况中，虽然依赖了某个模块，但其实只使用其中的某些功能。通过 tree-shaking，将没有使用的模块摇掉，这样来达到删除无用代码的目的。

#### DCE是什么？  
Tree-shaking的本质是消除无用的js代码。无用代码消除在广泛存在于传统的编程语言编译器中，编译器可以判断出某些代码根本不影响输出，然后消除这些代码，这个称之为DCE（dead code elimination）。  

Tree-shaking 是 DCE 的一种新的实现，Javascript同传统的编程语言不同的是，javascript绝大多数情况需要通过网络进行加载，然后执行，加载的文件大小越小，整体执行时间更短，所以去除无用代码以减少文件体积，对javascript来说更有意义。

```
// foo没有被用到，无用代码
let foo = () => {
    // x 和 if代码块都是无用代码
    let x = 1;
    if (false) {
        console.log('never reached')
    }
    
    let a = 3;
    return a;
}

let bar = () => {
    let x = 1;
    console.log(x);
    
    // 没用使用的函数
    function unused() {
        return 5;
    }
    
    return x;
    
    // 无效的代码
    let c = x + 1;
    return c;
}

bar();
```
什么是死代码？  
- 代码不会被执行，不可到达
- 代码执行的结果不会被用到
- 代码只会影响死变量（只写不读）  
上面注释里面的代码都满足这些特征，都是应该被消除的死代码。  

那是谁在帮忙把这些死代码做了消除呢？
- 首先肯定不是浏览器做DCE，因为当我们的代码送到浏览器，那还谈什么消除无法执行的代码来优化呢，所以肯定是送到浏览器之前的步骤进行优化。
- 其实也不是webpack做的，而是著名的代码压缩优化工具uglify，uglify完成了javascript的DCE。  
- 

#### tree-shaking消除大法
> tree shaking依赖ES2015 模块语法的 静态结构特性，例如 import 和 export。  

在ES6以前，我们可以使用CommonJS引入模块：require()，这种引入是动态的，也意味着我们可以基于条件来导入需要的代码：

```
let dynamicModule;
// 动态导入
if(condition) {
    myDynamicModule = require("foo");
} else {
    myDynamicModule = require("bar");
}
```

ES6的import语法完美可以使用tree shaking，因为可以在代码不运行的情况下就能分析出不需要的代码。
```
import foo from "foo";
import bar from "bar";

if(condition) {
    // foo.xxxx
} else {
    // bar.xxx
}
```


ES6 module 特点：
- 只能作为模块顶层的语句出现
- import 的模块名只能是字符串常量
- import binding 是 immutable的

ES6模块依赖关系是确定的，和运行时的状态无关，可以进行可靠的静态分析，这就是tree-shaking的基础。  

所谓静态分析就是不执行代码，从字面量上对代码进行分析，ES6之前的模块化，比如我们可以动态require一个模块，只有执行后才知道引用的什么模块，这个就不能通过静态分析去做优化。  

这是 ES6 modules在设计时的一个重要考量，也是为什么没有直接采用 CommonJS，正是基于这个基础上，才使得 tree-shaking 成为可能，这也是为什么 rollup 和 webpack 2 都要用 ES6 module syntax 才能 tree-shaking。

看个官网的例子：  
utils.js  

```
export function post() {
    console.log('do post');
}

export function get() {
    console.log('do get');
}
```

index.js

```
import {get} from './utils.js';
get();
```
- index中只用了get方法，所以打包的内容中应该只有get；
- 注意，uglify目前不会跨文件去做DCE，所以上面这种情况，uglify是不能优化的。

## 如何使用tree-shaking
查找文档或者会得到以下的答案：
- webpack4,只需要将mode设置为production即可开启tree shaking
- 通过 package.json 的 "sideEffects"属性，来实现这种方式。
- optimization 里面 usedExports设为true  
他们都是什么意思呢？

#### 如何开启tree-shaking
```
module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
 mode: 'development',
 optimization: {
   usedExports: true,  // usedExports其实就是我们所说的tree-shaking
 },
};
```
- useExports其实就是我们所说的tree-shaking
- 为什么在配置中常常看不到这个配置呢？是因为在production模式中这个是自动开启的

#### 什么是副作用 sideEffects
> sideEffects 和 usedExports（更多被认为是 tree shaking）是两种不同的优化方式。

> sideEffects 更为有效 是因为它允许跳过整个模块/文件和整个文件子树。

> usedExports 依赖于 terser 去检测语句中的副作用。它是一个 JavaScript 任务而且没有像 sideEffects 一样简单直接。而且它不能跳转子树/依赖由于细则中说副作用需要被评估。尽管导出函数能运作如常，但 React 框架的高阶函数（HOC）在这种情况下是会出问题的。

上面是官方文档中的解释，我们要区分开来sideEffects和usedExports两个概念  

**什么是sideEffects呢**？  
举个例子  
- 有一个ployfill.js文件，它没有任何export，所以usedExports会要在打包的时候移除它
- 问题来了，这个文件能被安全的移除吗？它有其他的副作用吗？
- webpack在尝试分析哪些文件，哪些代码有副作用，但是太难了
- 于是有一些辅助的配置帮助我们告诉webpakc哪些文件有副作用

#### sideEffects属性配置
```
/*#__PURE__*/ double(55);
```
通过/*#__PURE__*/帮助webpack知道这个函数是无副作用的  

在package.json中配置：

```
// ...
"sideEffects": [
  "**/*.css",
  "**/*.scss",
  "./esnext/index.js",
  "./esnext/configure.js"
],
// ...
```
"**/*.css"文件是有副作用的，不要移除它等等

###  ------- **你以为这就结束了吗？** --------------  
- 请仔细阅读这篇文章[你的Tree-Shaking并没什么卵用](https://zhuanlan.zhihu.com/p/32831172)
- 接下来我们稍微讲讲这篇文档
- 仔细看的同学应该注意到了，上文只是提到了函数的tree-shaking，我们还有一种情况，类的tree-shaking
下面看这个文档中的例子：

menu.js文件
```
export class Person {
  constructor ({ name, age, sex }) {
    this.className = 'Person'
    this.name = name
    this.age = age
    this.sex = sex
  }
  getName () {
    return this.name
  }
}

export class Apple {
  constructor ({ model }) {
    this.className = 'Apple'
    this.model = model
  }
  getModel () {
    return this.model
  }
}
```

main.js文件

```
import {Apple} from './menu.js';

const appleModel = new Apple({
  model: 'IphoneX'
}).getModel()
```
- 我们在menu文件中只是使用了Apple类，并没有用到Person，所以我们期望是打包只打包进去Apple，删掉Person。
- 文档中的结果是说，没有达到我们预期，为什么呢？
- 因为进行了babel的转换，非loose模式下，编译后的结果_createClass是有副作用的（详情请阅读原文）

**接下来，我们自己进行验证**  
1）既然说是babel转换导致的，那我首先不做babel转换，看能不能shaking掉Person类
```
(() => {
    "use strict";
    console.log("do get");
    console.log(1);
    new class {
        constructor({model: e}) {
            this.className = "Apple", this.model = e
        }

        getModel() {
            return this.model
        }
    }({model: "IphoneX"}).getModel();
    (new Menu).show()
})();
```
确实没有Person类了，符合预期  
2）使用babel转换，按照文档中的预期是不能shaking掉Person类的：babel配置详情见github

```
var t = function () {
    function n(o) {
        var t = o.model;
        e(this, n), this.className = "Apple", this.model = t
    }

    return o(n, [{
        key: "getModel", value: function () {
            return this.model
        }
    }]), n
}();
```
诶？我们发现我们打包的结果里面还是没有Person类，为什么呢？  
3）为什么结果与文档有差异  
- 文档中解释说babel做了转换，结果为
```
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _createClass = function() {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || !1, descriptor.configurable = !0,
      "value" in descriptor && (descriptor.writable = !0), Object.defineProperty(target, descriptor.key, descriptor);
    }
  }
  return function(Constructor, protoProps, staticProps) {
    return protoProps && defineProperties(Constructor.prototype, protoProps), staticProps && defineProperties(Constructor, staticProps),
    Constructor;
  };
}()

var Person = function () {
  function Person(_ref) {
    var name = _ref.name, age = _ref.age, sex = _ref.sex;
    _classCallCheck(this, Person);

    this.className = 'Person';
    this.name = name;
    this.age = age;
    this.sex = sex;
  }

  _createClass(Person, [{
    key: 'getName',
    value: function getName() {
      return this.name;
    }
  }]);
  return Person;
}();
```
- 那我们自己用babel转换一下试试

```
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Apple = exports.Person = void 0;

function _instanceof(left, right) { if (right != null && typeof Symbol !== "undefined" && right[Symbol.hasInstance]) { return !!right[Symbol.hasInstance](left); } else { return left instanceof right; } }

function _classCallCheck(instance, Constructor) { if (!_instanceof(instance, Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

// componetns.js
var Person = /*#__PURE__*/function () {
  function Person(_ref) {
    var name = _ref.name,
        age = _ref.age,
        sex = _ref.sex;

    _classCallCheck(this, Person);

    this.className = 'Person';
    this.name = name;
    this.age = age;
    this.sex = sex;
  }

  _createClass(Person, [{
    key: "getName",
    value: function getName() {
      return this.name;
    }
  }]);

  return Person;
}();

exports.Person = Person;

var Apple = /*#__PURE__*/function () {
  function Apple(_ref2) {
    var model = _ref2.model;

    _classCallCheck(this, Apple);

    this.className = 'Apple';
    this.model = model;
  }

  _createClass(Apple, [{
    key: "getModel",
    value: function getModel() {
      return this.model;
    }
  }]);

  return Apple;
}();

exports.Apple = Apple;
```
- 不知道大家发现什么端倪没有，/*#__PURE__*/
- 破案了，现在的babel加上了这个告诉webpack这个方法是无副作用的
- /*#__PURE__*/这个来源也挺有意思的，可以看看文档
- 到这里就真的结束啦。。。。

### 结论
因此，我们学到为了利用 tree shaking 的优势， 你必须...

- 使用 ES2015 模块语法（即 import 和 export）。
- 确保没有编译器将您的 ES2015 模块语法转换为 CommonJS 的（顺带一提，这是现在常用的 @babel/preset-env 的默认行为，详细信息请参阅文档）。
- 在项目的 package.json 文件中，添加 "sideEffects" 属性。
- 使用 mode 为 "production" 的配置项以启用更多优化项，包括压缩代码与 tree shaking。

### 拓展思考：来自于参考阅读里面的
- css是否也能有tree-shaking?

### 参考文档
[浅析tree-shaking工作原理](https://twindy.org/qian-xi-tree-shakinggong-zuo-yuan-li/)

[tree-shaking性能优化实践](https://juejin.im/post/6844903544756109319)

[tree-shaking性能优化实践-实践篇](https://juejin.im/post/6844903544760336398)

[tree-shaking官方文档](https://webpack.docschina.org/guides/tree-shaking/)

[你的Tree-Shaking并没什么卵用](https://zhuanlan.zhihu.com/p/32831172)