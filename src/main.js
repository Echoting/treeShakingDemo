import {get} from './utils.js';
import {Apple} from './menu.js';
get();

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

const appleModel = new Apple({
  model: 'IphoneX'
}).getModel()

const testMenu = new Menu()
testMenu.show()

// console.log(appleModel)