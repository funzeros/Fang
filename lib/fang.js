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
    }
    parseDom(arg) {
      const objE = document.createElement("div");
      objE.innerHTML = arg;
      return objE.childNodes;
    }
    setHtml(htmlFn) {
      this.htmlFn = htmlFn;
    }
    parseAttrs(dom) {
      for (const attrs of dom.attributes) {
        if (attrs.name.startsWith("@")) {
          this.bindEvent(dom, attrs);
          dom.removeAttribute(attrs.name);
        }
      }
    }
    variablePool = new Map();
    bindEvent(dom, attrs) {
      const { name, value } = attrs;
      const [eventName, ...decorate] = name.substring(1).split(".");
      if (this.variablePool.has(value)) {
        const event = this.variablePool.get(value);
        dom.addEventListener(
          eventName,
          event,
          decorate.includes("capture") ? true : false
        );
      }
    }
    setStyle(styleFn) {
      this.styleFn = styleFn;
    }
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
    update(callback) {
      this.shadow.innerHTML = "";
      if (this.styleFn) {
        this.styleDOM = document.createElement("style");
        this.shadow.appendChild(this.styleDOM);
        this.styleDOM.textContent = this.styleFn();
      }
      if (this.htmlFn) {
        for (const dom of this.parseDom(this.htmlFn())) {
          this.parseAttrs(dom);
          this.shadow.appendChild(dom);
        }
      }
      callback && callback();
    }
    #options = {
      scripts: "",
      htmls: "",
      styles: "",
    };
    setup(options) {
      this.#options = options;
      this.render();
    }
    #state = [];
    #stateIndex = 0;
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
    inject = [
      ["getHtml", this.setHtml.bind(this)],
      ["getStyle", this.setStyle.bind(this)],
      ["expose", this.expose.bind(this)],
      ["useState", this.useState.bind(this)],
    ];
    get injectKeys() {
      return this.inject.map(([key]) => key);
    }
    get injectValues() {
      return this.inject.map(([, value]) => value);
    }
    render() {
      this.#stateIndex = 0;
      const { scripts, htmls, styles } = this.#options;
      new Function(
        ...this.injectKeys,
        `${scripts} ;(function(){getHtml(()=>\`${htmls}\`);getStyle(()=>\`${styles}\`);})()
          `
      )(...this.injectValues);
      this.update();
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
          for (const element of template.content.children) {
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
