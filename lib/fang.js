(function (global) {
  global.Fang = function Fang() {};
  Fang.utils = {
    equal(arg1, arg2) {
      return arg1 === arg2;
    },
    unequal() {
      return !this.equal(...arguments);
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
      this.styleDOM = document.createElement("style");
      this.shadow.appendChild(this.styleDOM);
    }
    parseDom(arg) {
      var objE = document.createElement("div");
      objE.innerHTML = arg;
      return objE.childNodes;
    }
    setHtml(html) {
      for (const dom of this.parseDom(html)) {
        this.shadow.appendChild(dom);
      }
    }
    setStyle(style) {
      this.styleDOM.innerHTML = style;
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
    function parser(text) {
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
        document.body.appendChild(fd);
        new Function(
          "getHtml",
          "getStyle",
          `${scripts.lf} ;(function(){getHtml(\`${htmls.lf}\`);getStyle(\`${styles.lf}\`);})()`
        )(fd.setHtml.bind(fd), fd.setStyle.bind(fd));
      })();
    }
    (function () {
      for (const script of scripts) {
        const { type, src } = script;
        if (utils.unequal(type, SCRIPT_TYPE_FANG)) continue;
        fetch(src)
          .then((response) => response.text())
          .then(parser);
      }
    })();
  }
  window.addEventListener("load", onLoad, false);
})(this);
