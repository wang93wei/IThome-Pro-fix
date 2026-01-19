// ==UserScript==
// @name         IThome Pro fix
// @version      4.8.0
// @description  优化ithome网页端浏览效果-修复版
// @match        *://*.ithome.com/*
// @run-at       document-start
// @namespace    https://github.com/wang93wei/IThome-Pro-fix
// @supportURL   https://github.com/wang93wei/IThome-Pro-fix/issues
// @license MIT
// ==/UserScript==

(function () {
  "use strict";

  // 启用评论框：true：启用 false：关闭
  const showCommentBox = false;

  // 定义样式-hideStyle：不透明度 0 + 隐藏登录提示
  const hideStyle = document.createElement("style");
  hideStyle.innerHTML = `
    body { opacity: 0; }
    #rm-login-modal, #rm-login-modal *, #login-guide-box { display: none !important; }
  `;
  document.head.appendChild(hideStyle);

  // 跳转到 blog 页面，加载完成前隐藏原始页面
  if (
    window.location.href === "https://www.ithome.com" ||
    window.location.href === "https://www.ithome.com/"
  ) {
    document.head.appendChild(hideStyle);
    window.location.replace("https://www.ithome.com/blog/");
    return;
  }

  // blog 页面加载完成前隐藏原始页面
  if (window.location.href.startsWith("https://www.ithome.com/blog/")) {
    document.head.appendChild(hideStyle);
  }

  // 函数：保持页面激活，这样可以去除弹出的登录框
  function keepPageActive() {
    const event = new Event("mousemove", { bubbles: true, cancelable: true });

    // 设置定时器，每0.1秒触发一次事件
    const intervalId = setInterval(() => {
      document.dispatchEvent(event);
    }, 100); // 0.1秒（100毫秒）

    // 5秒后停止定时器
    setTimeout(() => {
      clearInterval(intervalId);
      console.log("Stopped keeping page active.");
    }, 5000); // 5秒（5000毫秒）
  }

  // [调用] 保持页面激活
  keepPageActive();

  const processedImages = new WeakSet();
  const processedElements = new WeakSet();
  const originalStyles = new WeakMap();

  const hideElements = () => {
    const selectors = new Set([
      "#nav",
      "#top",
      "#tt",
      "#list > div.fr.fx:last-child",
      "#side_func",
      "#dt > div.fl.content:first-child > div.cv:first-child",
      "#dt > div.fr.fx:last-child",
      "#dt > div.fl.content:first-child > div.newsgrade:nth-child(6)",
      "#dt > div.fl.content:first-child > div.shareto:nth-child(7)",
      "#dt > div.fl.content:first-child > iframe.dajia:nth-child(10)",
      "#dt > div.fl.content:first-child > div.newsgrade:nth-child(8)",
      "#dt > div.fl.content:first-child > div.newserror:nth-child(7)",
      "#dt > div.fl.content:first-child > div.newsreward:nth-child(6)",
      "#dt > div.fl.content:first-child > div.shareto:nth-child(9)",
      "#rm-login-modal > div.modal.has-title.loaded",
      "#dt > div.fl.content:first-child > div.related_post:nth-child(8)",
      "#dt > div.fl.content:first-child > div.newserror:nth-child(5)",
      "#paragraph > p.ad-tips:last-child",
      "#fls",
      "#fi",
      "#lns",
      "#paragraph > div.tougao-user:nth-child(2)",
      "#login-guide-box",
      ".dajia",
      "#paragraph > div.tagging1:last-child",
      "#paragraph > p.ad-tips",
      '[id^="ad-id-"]',
      "div.-hongbao-container.bb:nth-child(6)",
    ]);

    if (!showCommentBox) {
      selectors.add("#postcomment3");
    }

    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        element.style.display = "none";
      });
    });
  };

  const imageStyles = new Map([
    ['home', {
      border: "3px solid #CCC",
      borderRadius: "12px",
      display: "inline-block",
      overflow: "hidden"
    }],
    ['video', {
      border: "3px solid #CCC",
      borderRadius: "12px",
      overflow: "hidden",
      maxWidth: "100%",
      display: "block",
      margin: "0 auto"
    }],
    ['longImage', {
      borderRadius: "12px",
      border: "3px solid #CCC",
      width: "400px",
      maxWidth: "400px",
      height: "auto",
      objectFit: "cover",
      overflow: "hidden"
    }],
    ['regular', {
      borderRadius: "12px",
      border: "3px solid #CCC",
      maxWidth: "450px"
    }]
  ]);

  const processImage = (image) => {
    if (processedImages.has(image)) return;
    
    if (image.closest("#post_comm")) return;
    if (image.classList.contains("titleLogo")) return;
    if (image.classList.contains("lazy") && image.classList.contains("emoji"))
      return;
    if (
      image.classList.contains("ruanmei-emoji") &&
      image.classList.contains("emoji")
    )
      return;
    if (image.id === "image-viewer" || image.classList.contains("zoomed"))
      return;
    if (image.classList.contains("comment-image")) return;

    if (image.closest("a.img")) {
      const anchor = image.closest("a.img");
      if (!anchor.classList.contains("processed")) {
        Object.assign(anchor.style, imageStyles.get('home'));
        anchor.classList.add("processed");
        processedImages.add(image);
      }
    } else if (image.closest(".ithome_super_player")) {
      const videoPlayer = image.closest(".ithome_super_player");
      if (!videoPlayer.parentNode.classList.contains("processed")) {
        const wrapper = document.createElement("div");
        Object.assign(wrapper.style, imageStyles.get('video'));
        wrapper.classList.add("processed");
        videoPlayer.parentNode.insertBefore(wrapper, videoPlayer);
        wrapper.appendChild(videoPlayer);

        const img = videoPlayer.querySelector("img");
        if (img) {
          const imgWidth = img.getAttribute("w");
          const imgHeight = img.getAttribute("h");
          const parentHeight = wrapper.offsetHeight;

          if (imgWidth > wrapper.offsetWidth) {
            const aspectRatio = imgWidth / imgHeight;
            img.style.height = `${parentHeight}px`;
            img.style.width = `${parentHeight * aspectRatio}px`;
            img.style.objectFit = "cover";
          } else {
            img.style.width = `${imgWidth}px`;
            img.style.height = `${imgHeight}px`;
          }
        }
        processedImages.add(image);
      }
    } else {
      if (image.height > 1000) {
        Object.assign(image.style, imageStyles.get('longImage'));
      } else {
        Object.assign(image.style, imageStyles.get('regular'));
      }
      processedImages.add(image);
    }
  };

  // [调用] 图片处理
  function setRoundedImages() {
    document.querySelectorAll("img").forEach((image) => processImage(image));
  }

  const styleConfig = new Map([
    ['headerImage', {
      borderRadius: "12px",
      border: "3px solid #CCC"
    }],
    ['rounded', {
      borderRadius: "12px"
    }],
    ['addComm', {
      borderRadius: "0px 0px 12px 12px"
    }],
    ['card', {
      borderRadius: "12px",
      transform: "scale(0.8)"
    }]
  ]);

  const styleHeaderImage = () => {
    const headerImages = document.querySelectorAll(".list .entry .headerimage");

    headerImages.forEach((image) => {
      if (!processedImages.has(image)) {
        Object.assign(image.style, styleConfig.get('headerImage'));
        processedImages.add(image);
      }
    });
  };

  // 函数：多图连续排列时插入间隔
  function wrapImagesInP() {
    if (window.location.href.startsWith("https://www.ithome.com/blog/")) return;
    document.querySelectorAll("img").forEach((image) => {
      // 这部分匹配到的图片不处理
      if (image.closest("#post_comm")) return;
      if (image.closest(".ithome_super_player")) return;
      if (
        image.classList.contains("ruanmei-emoji") &&
        image.classList.contains("emoji")
      )
        return;
      if (image.classList.contains("ithome_super_player")) return;
      if (
        image.parentNode.tagName.toLowerCase() === "p" &&
        image.parentNode.children.length === 1
      )
        return;
      if (image.width < 25 || image.height < 20) return;

      const p = document.createElement("p");
      p.style.textAlign = "center";
      p.style.margin = "0";
      p.setAttribute("data-vmark", "f5e8");
      image.parentNode.insertBefore(p, image);
      p.appendChild(image);
    });
  }

  const processIframes = () => {
    const iframes = document.querySelectorAll(
      '.content .post_content iframe.ithome_video, .content .post_content iframe[src*="player.bilibili.com"]',
    );

    iframes.forEach((iframe) => {
      if (!processedElements.has(iframe) && !iframe.classList.contains("processed")) {
        Object.assign(iframe.style, {
          borderRadius: "12px",
          border: "3px solid #CCC",
          display: "block",
          margin: "0 auto",
          overflow: "hidden"
        });
        iframe.classList.add("processed");
        processedElements.add(iframe);
      }
    });
  };

  const setRounded = () => {
    const roundeds = document.querySelectorAll(
      ".comm_list ul.list li.entry ul.reply, .content .post_content blockquote, " +
        ".add_comm input#btnComment, .card, span.card",
    );
    roundeds.forEach((rounded) => Object.assign(rounded.style, styleConfig.get('rounded')));

    document.querySelectorAll(".add_comm").forEach((addCommElement) => {
      Object.assign(addCommElement.style, styleConfig.get('addComm'));
    });

    document.querySelectorAll(".card, span.card").forEach((card) => {
      Object.assign(card.style, styleConfig.get('card'));
    });
  };

  // 函数：移除首页信息流广告
  function removeAds() {
    document
      .querySelectorAll("div.bb.clearfix > div.fl > ul.bl > li")
      .forEach((element) => {
        if (element.querySelector("div.c > div.m:empty")) element.remove();
      });
  }

  const debounce = (fn, delay = 500) => {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  };

  const autoClickLoadMore = async () => {
    const loadMoreButton = document.querySelector("a.more");

    if (!loadMoreButton) return;

    const rect = loadMoreButton.getBoundingClientRect();
    const isVisible = rect.top < window.innerHeight && rect.bottom > 0;

    if (isVisible) {
      loadMoreButton.click();
    }
  };

  const debouncedAutoClickLoadMore = debounce(autoClickLoadMore, 500);

  window.addEventListener("scroll", debouncedAutoClickLoadMore);

  (async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    await autoClickLoadMore();
  })();

  const forceLoadComments = async () => {
    const footer = document.querySelector("#post_comm");

    const spacer = document.createElement("div");
    Object.assign(spacer.style, {
      height: "100vh",
      visibility: "hidden"
    });
    document.body.appendChild(spacer);

    window.scrollTo(0, document.body.scrollHeight);

    await new Promise(resolve => setTimeout(resolve, 100));

    spacer.remove();
    window.scrollTo(0, 0);

    hideElements();
  };

  const wrapperStyles = new Map([
    ['hoverWrapper', {
      position: "relative",
      padding: "12px 16px",
      borderRadius: "12px",
      overflow: "hidden",
      margin: "16px 0"
    }],
    ['hover', {
      boxShadow: "0px 6px 15px rgba(0, 0, 0, 0.2)"
    }],
    ['normal', {
      boxShadow: "none",
      backgroundColor: "transparent"
    }]
  ]);

  const initializePage = () => {
    const makeListItemsClickable = () => {
      const listItems = document.querySelectorAll(".bl > li");

      listItems.forEach((li) => {
        if (li.closest('.hover-wrapper')) return;

        const wrapper = document.createElement("div");
        wrapper.classList.add("hover-wrapper");
        Object.assign(wrapper.style, wrapperStyles.get('hoverWrapper'));

        li.parentNode.insertBefore(wrapper, li);
        wrapper.appendChild(li);

        const titleLink = li.querySelector("h2 a");

        if (titleLink) {
          const titleText = document.createTextNode(titleLink.textContent);
          titleLink.replaceWith(titleText);

          wrapper.style.cursor = "pointer";
          wrapper.addEventListener("click", () => {
            window.open(titleLink.href, titleLink.target ?? "_self");
          });

          wrapper.addEventListener("mouseover", () => {
            Object.assign(wrapper.style, wrapperStyles.get('hover'));
            wrapper.style.backgroundColor = getBackgroundColor();
          });

          wrapper.addEventListener("mouseout", () => {
            Object.assign(wrapper.style, wrapperStyles.get('normal'));
          });
        }
      });
    };

    const setHome = () => {
      const divs = document.querySelectorAll("div.fl");
      divs.forEach((div) => {
        div.style.width = "870px";
      });
    };

    const removeMarginTop = () => {
      const hoverWrappers = document.querySelectorAll(".hover-wrapper");
      hoverWrappers.forEach((hoverWrapper) => {
        const listItems = hoverWrapper.querySelectorAll("li");
        listItems.forEach((item) => {
          item.style.marginTop = "0";
        });
      });
    };

    const setDivWidthTo590 = () => {
      const divs = document.querySelectorAll("div.c");
      divs.forEach((div) => {
        div.style.width = "640px";
      });
    };

    const getBackgroundColor = () => {
      if (
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      ) {
        return "#333333";
      } else {
        return "#f9f9f9";
      }
    };

    makeListItemsClickable();
    setHome();
    removeMarginTop();
    setDivWidthTo590();
  };

  const replaceImageWrapper = () => {
    const imageWrappers = document.querySelectorAll(
      ".post-img-list a.img-wrapper",
    );

    imageWrappers.forEach((wrapper) => {
      const img = wrapper.querySelector("img");
      if (img && !processedImages.has(img)) {
        const parent = wrapper.parentElement;

        wrapper.classList.remove("img-wrapper");
        wrapper.classList.add("img-click");

        wrapper.removeAttribute("href");

        const originalWidth = img.style.width;
        const originalHeight = img.style.height;
        originalStyles.set(img, { width: originalWidth, height: originalHeight });

        Object.assign(img.style, {
          width: "30%",
          height: "auto",
          borderRadius: "12px",
          border: "3px solid #CCC"
        });

        let isZoomed = false;

        img.addEventListener("click", () => {
          if (isZoomed) {
            const original = originalStyles.get(img);
            Object.assign(img.style, {
              width: original?.width || "30%",
              height: original?.height || "auto"
            });
          } else {
            img.style.width = "100%";
          }
          img.style.height = "auto";
          isZoomed = !isZoomed;
        });

        processedImages.add(img);
      }
    });
  };

  const observeDOM = () => {
    let isProcessing = false;
    let debounceTimer = null;

    const observer = new MutationObserver((mutationsList) => {
      if (isProcessing) return;

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        isProcessing = true;

        try {
          const mutationPromises = [];

          for (const mutation of mutationsList) {
            if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
              const hasNewContent = Array.from(mutation.addedNodes).some(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  return !node.classList.contains('hover-wrapper') &&
                         !node.classList.contains('processed') &&
                         (node.querySelector && (
                           node.querySelector('.bl > li') ||
                           node.querySelector('img') ||
                           node.querySelector('.content')
                         ));
                }
                return false;
              });

              if (hasNewContent) {
                mutationPromises.push(
                  Promise.all([
                    Promise.resolve(wrapImagesInP()),
                    Promise.resolve(setRounded()),
                    Promise.resolve(removeAds()),
                    Promise.resolve(hideElements()),
                    Promise.resolve(setRoundedImages()),
                    Promise.resolve(styleHeaderImage()),
                    Promise.resolve(initializePage()),
                    Promise.resolve(replaceImageWrapper())
                  ])
                );

                mutation.addedNodes.forEach(node => {
                  if (node.nodeType === Node.ELEMENT_NODE) {
                    const images = node.querySelectorAll ? node.querySelectorAll('img') : [];
                    images.forEach(img => {
                      if (img.hasAttribute("loading")) {
                        img.removeAttribute("loading");
                      }
                      if (img.classList.contains("lazy")) {
                        img.classList.remove("lazy");
                      }
                      if (img.dataset.src) {
                        img.src = img.dataset.src;
                      }
                      if (img.dataset.original) {
                        img.src = img.dataset.original;
                      }
                      img.loading = "eager";
                    });
                  }
                });
              }
            }
          }

          await Promise.all(mutationPromises);
        } finally {
          setTimeout(() => {
            isProcessing = false;
          }, 200);
        }
      }, 300);
    });

    observer.observe(document.body, { childList: true, subtree: true });
  };

  window.addEventListener("load", async () => {
    await Promise.all([
      Promise.resolve(hideElements()),
      Promise.resolve(forceLoadComments()),
      Promise.resolve(removeAds()),
      Promise.resolve(wrapImagesInP()),
      Promise.resolve(setRounded()),
      Promise.resolve(processIframes()),
      Promise.resolve(setRoundedImages()),
      Promise.resolve(styleHeaderImage()),
      Promise.resolve(initializePage()),
      Promise.resolve(replaceImageWrapper()),
      Promise.resolve(observeDOM())
    ]);

    document.body.style.opacity = "1";

    document.querySelectorAll("img").forEach((img) => {
      if (img.hasAttribute("loading")) {
        img.removeAttribute("loading");
      }
      if (img.classList.contains("lazy")) {
        img.classList.remove("lazy");
      }
      if (img.dataset.src) {
        img.src = img.dataset.src;
      }
      if (img.dataset.original) {
        img.src = img.dataset.original;
      }
      img.loading = "eager";
    });
  });
})();
