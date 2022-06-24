(function (global) {
  global.Fang = function Fang() {};
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
              const value = object[name];
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
    const scripts = document.getElementsByTagName(SCRIPT_TAG_NAME);
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
          if (selector) {
            const app = document.querySelector(selector);
            if (app) {
              app.innerHTML = "";
              app.appendChild(fd);
            }
          } else {
            document.body.appendChild(fd);
          }
          const inject = [
            ["getHtml", fd.setHtml.bind(fd)],
            ["getStyle", fd.setStyle.bind(fd)],
            ["expose", fd.expose.bind(fd)],
            ["update", fd.update.bind(fd)],
          ];
          new Function(
            ...inject.map(([key]) => key),
            `${scripts.lf} ;(function(){getHtml(()=>\`${htmls.lf}\`);getStyle(()=>\`${styles.lf}\`);})()
          `
          )(...inject.map(([, value]) => value));
          fd.update();
        })();
      };
    }
    (function () {
      for (const script of scripts) {
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
