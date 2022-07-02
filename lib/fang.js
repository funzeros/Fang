(function (global) {
  function Fang() {}
  Object.defineProperty(global, "Fang", {
    writable: false,
    configurable: false,
    value: Fang,
  });
  Fang.utils = {
    equal(arg1, arg2) {
      return arg1 === arg2;
    },
    unequal() {
      return !this.equal(...arguments);
    },
    crypto:
      window.crypto ||
      window.webkitCrypto ||
      window.mozCrypto ||
      window.oCrypto ||
      window.msCrypto,
    random() {
      return this.crypto.getRandomValues(new Uint32Array(1));
    },
  };
  Fang.class = {
    FArray: class FArray extends Array {
      get lf() {
        return this.join("\n");
      }
    },
  };
  class FangDOM extends HTMLElement {
    constructor() {
      super();
      this.shadow = this.attachShadow({ mode: "closed" });
      this.key = Fang.utils.random().toString();
      this.styleDOM = document.createElement("style");
      this.shadow.appendChild(this.styleDOM);
      this.templateDOM = document.createElement("template");
    }
    // 解析dom
    parseDom(arg) {
      const objE = document.createElement("div");
      objE.innerHTML = arg;
      return objE.childNodes;
    }
    // html备份
    #html = "";
    // parse和complier和更新html
    setHtml(htmlStr) {
      if (htmlStr === this.#html) return;
      this.#html = htmlStr;
      const childArray = Array.from(this.shadow.childNodes);
      while (!0) {
        const node = childArray.pop();
        if (!node) break;
        if (
          node.nodeType === Node.ELEMENT_NODE &&
          node.tagName.toLowerCase() === "style"
        )
          continue;
        this.shadow.removeChild(node);
      }
      this.complier(this.parseDom(htmlStr), true);
      this.shadow.appendChild(this.templateDOM.content);
    }
    // 编译dom上的属性 完成属性设置
    complier(nodes, append) {
      for (const dom of Array.from(nodes)) {
        switch (dom.nodeType) {
          case Node.ELEMENT_NODE:
            {
              this.parseAttrs(dom);
              if (append) this.templateDOM.content.appendChild(dom);
              if (dom.childNodes.length)
                setTimeout(this.complier.bind(this, dom.childNodes, false), 1);
            }
            break;
          case Node.TEXT_NODE:
            {
              if (append) this.templateDOM.content.appendChild(dom);
            }
            break;
          default:
            break;
        }
      }
    }
    // 解析属性和事件绑定
    parseAttrs(dom) {
      for (const attrs of dom.attributes) {
        if (attrs.name.startsWith("@")) {
          this.bindEvent(dom, attrs);
          dom.removeAttribute(attrs.name);
        }
      }
    }
    // 事件绑定
    variablePool = new Map();
    bindEvent(dom, attrs) {
      const { name, value } = attrs;
      const [eventName, ...decorate] = name.substring(1).split(".");
      if (this.variablePool.has(value)) {
        const event = this.variablePool.get(value);
        dom.addEventListener(
          eventName,
          function (e, ...rest) {
            if (decorate.includes("stop")) e.stopPropagation();
            if (decorate.includes("prevent")) e.preventDefault();
            return event(e, rest);
          },
          decorate.includes("capture") ? true : false
        );
      }
    }
    // 样式备份
    #style = "";
    // 设置样式
    setStyle(styleStr) {
      if (styleStr === this.#style) return;
      this.#style = styleStr;
      this.styleDOM.textContent = styleStr;
    }
    // 获取导出变量
    expose(...rest) {
      if (rest.length === 2) {
        const [name, value] = rest;
        this.variablePool.set(name, value);
        return value;
      }
      if (rest.length === 1) {
        const [object] = rest;
        if (object instanceof Object) {
          for (const name in object) {
            if (Object.hasOwnProperty.call(object, name)) {
              this.variablePool.set(name, object[name]);
            }
          }
        }
        return object;
      }
    }
    // 组件三剑客源码
    #options = {
      scripts: "",
      htmls: "",
      styles: "",
    };
    setup(options) {
      this.#options = options;
      this.render();
    }
    // 状态池
    #state = [];
    // 当前hooks顺序
    #stateIndex = 0;
    // hooks state
    useState(initValue) {
      const index = this.#stateIndex++;
      if (!(this.#state.length > index)) {
        this.#state[index] = initValue;
      }
      return [
        this.#state[index],
        (v) => {
          if (v instanceof Function) this.#state[index] = v(this.#state[index]);
          else this.#state[index] = v;
          setTimeout(this.render.bind(this), 1);
          return this.#state[index];
        },
      ];
    }
    // 注入的方法
    inject = [
      ["renderHtml", this.setHtml.bind(this)],
      ["renderStyle", this.setStyle.bind(this)],
      ["expose", this.expose.bind(this)],
      ["useState", this.useState.bind(this)],
    ];
    injectKeys = this.inject.map(([key]) => key);
    injectValues = this.inject.map(([, value]) => value);
    // 渲染函数
    render() {
      this.#stateIndex = 0;
      const { scripts, htmls, styles } = this.#options;
      new Function(
        ...this.injectKeys,
        `${scripts} ;(function(){renderHtml(\`${htmls}\`);renderStyle(\`${styles}\`);})()
          `
      )(...this.injectValues);
    }
  }
  customElements.define("fang-dom", FangDOM);
})(this);

(function (global) {
  // constant
  const SCRIPT_TAG_NAME = "script";
  const SCRIPT_TYPE_FANG = "text/fang";
  const SCRIPT_TYPE_JS = "text/javascript";

  const {
    Fang: {
      utils,
      class: { FArray },
    },
  } = global;
  // constant

  // feature
  function onLoad() {
    const scriptTags = document.getElementsByTagName(SCRIPT_TAG_NAME);
    function parser(selector) {
      return function (text) {
        const template = document.createElement("template");
        template.innerHTML = text;
        (function () {
          const scripts = new FArray();
          const htmls = new FArray();
          const styles = new FArray();
          for (const element of Array.from(template.content.childNodes)) {
            if (element.nodeType === Node.ELEMENT_NODE) {
              switch (element.tagName.toLowerCase()) {
                case "script":
                  scripts.push(element.textContent);
                  break;
                case "style":
                  styles.push(element.textContent);
                  break;
                default:
                  htmls.push(element.outerHTML);
                  break;
              }
            } else if (element.nodeType === Node.TEXT_NODE) {
              if (/^(\r?\n|(?<!\n)\r){1}$/.test(element.textContent)) continue;
              htmls.push(element.textContent);
            }
          }
          const fd = document.createElement("fang-dom");
          fd.setup({
            scripts: scripts.lf,
            htmls: htmls.lf,
            styles: styles.lf,
          });
          if (selector) {
            const app = document.querySelector(selector);
            if (app) {
              app.innerHTML = "";
              app.appendChild(fd);
            }
          }
        })();
      };
    }
    (function () {
      for (const script of scriptTags) {
        const { type, src } = script;
        if (utils.unequal(type, SCRIPT_TYPE_FANG)) continue;
        const mountSelector = script.getAttribute("mount");
        fetch(src)
          .then((response) => response.text())
          .then(parser(mountSelector));
      }
    })();
  }
  window.addEventListener("load", onLoad, false);
})(this);
