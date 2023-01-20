/*
 * File: iframeResizer.contentWindow.js
 * Desc: Include this file in any page being loaded into an iframe
 *       to force the iframe to resize to the content size.
 * Requires: iframeResizer.js on host page.
 * Doc: https://github.com/davidjbradshaw/iframe-resizer
 * Author: David J. Bradshaw - dave@bradshaw.net
 *
 */

// eslint-disable-next-line sonarjs/cognitive-complexity, no-shadow-restricted-names
(function (undefined) {
  if (typeof window === 'undefined') return; // don't run for server side render

  var autoResize = true,
    base = 10,
    bodyBackground = '',
    bodyMargin = 0,
    bodyMarginStr = '',
    bodyObserver = null,
    bodyPadding = '',
    calculateWidth = false,
    doubleEventList = { resize: 1, click: 1 },
    eventCancelTimer = 128,
    firstRun = true,
    height = 1,
    heightCalcModeDefault = 'bodyOffset',
    heightCalcMode = heightCalcModeDefault,
    initLock = true,
    initMsg = '',
    inPageLinks = {},
    interval = 32,
    intervalTimer = null,
    logging = false,
    mouseEvents = false,
    msgID = '[iFrameSizer]', // Must match host page msg ID
    msgIdLen = msgID.length,
    myID = '',
    resetRequiredMethods = {
      max: 1,
      min: 1,
      bodyScroll: 1,
      documentElementScroll: 1,
    },
    resizeFrom = 'child',
    sendPermit = true,
    target = window.parent,
    targetOriginDefault = '*',
    tolerance = 0,
    triggerLocked = false,
    triggerLockedTimer = null,
    throttledTimer = 16,
    width = 1,
    widthCalcModeDefault = 'scroll',
    widthCalcMode = widthCalcModeDefault,
    win = window,
    onMessage = function () {
      warn('onMessage function not defined');
    },
    onReady = function () {},
    onPageInfo = function () {},
    customCalcMethods = {
      height: function () {
        warn('Custom height calculation function not defined');
        return document.documentElement.offsetHeight;
      },
      width: function () {
        warn('Custom width calculation function not defined');
        return document.body.scrollWidth;
      },
    },
    eventHandlersByName = {},
    passiveSupported = false;

  function noop() {}

  try {
    var options = Object.create(
      {},
      {
        passive: {
          get: function () {
            passiveSupported = true;
          },
        },
      }
    );
    window.addEventListener('test', noop, options);
    window.removeEventListener('test', noop, options);
  } catch (error) {
    /* */
  }

  function addEventListener(el, evt, func, options) {
    el.addEventListener(evt, func, passiveSupported ? options || {} : false);
  }

  function removeEventListener(el, evt, func) {
    el.removeEventListener(evt, func, false);
  }

  function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  // Based on underscore.js
  function throttle(func) {
    var context,
      args,
      result,
      timeout = null,
      previous = 0,
      later = function () {
        previous = getNow();
        timeout = null;
        result = func.apply(context, args);
        if (!timeout) {
          // eslint-disable-next-line no-multi-assign
          context = args = null;
        }
      };

    return function () {
      var now = getNow();

      if (!previous) {
        previous = now;
      }

      var remaining = throttledTimer - (now - previous);

      context = this;
      args = arguments;

      if (remaining <= 0 || remaining > throttledTimer) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }

        previous = now;
        result = func.apply(context, args);

        if (!timeout) {
          // eslint-disable-next-line no-multi-assign
          context = args = null;
        }
      } else if (!timeout) {
        timeout = setTimeout(later, remaining);
      }

      return result;
    };
  }

  var getNow =
    Date.now ||
    function () {
      /* istanbul ignore next */ // Not testable in PhantomJS
      return new Date().getTime();
    };

  function formatLogMsg(msg) {
    return msgID + '[' + myID + '] ' + msg;
  }

  function log(msg) {
    if (logging && 'object' === typeof window.console) {
      // eslint-disable-next-line no-console
      console.log(formatLogMsg(msg));
    }
  }

  function warn(msg) {
    if ('object' === typeof window.console) {
      // eslint-disable-next-line no-console
      console.warn(formatLogMsg(msg));
    }
  }

  function init() {
    readDataFromParent();
    log('Initialising iFrame (' + window.location.href + ')');
    readDataFromPage();
    setMargin();
    setBodyStyle('background', bodyBackground);
    setBodyStyle('padding', bodyPadding);
    injectClearFixIntoBodyElement();
    checkHeightMode();
    checkWidthMode();
    stopInfiniteResizingOfIFrame();
    setupPublicMethods();
    setupMouseEvents();
    startEventListeners();
    inPageLinks = setupInPageLinks();
    sendSize('init', 'Init message from host page');
    onReady();
  }

  function readDataFromParent() {
    function strBool(str) {
      return 'true' === str;
    }

    var data = initMsg.substr(msgIdLen).split(':');

    myID = data[0];
    bodyMargin = undefined !== data[1] ? Number(data[1]) : bodyMargin; // For V1 compatibility
    calculateWidth = undefined !== data[2] ? strBool(data[2]) : calculateWidth;
    logging = undefined !== data[3] ? strBool(data[3]) : logging;
    interval = undefined !== data[4] ? Number(data[4]) : interval;
    autoResize = undefined !== data[6] ? strBool(data[6]) : autoResize;
    bodyMarginStr = data[7];
    heightCalcMode = undefined !== data[8] ? data[8] : heightCalcMode;
    bodyBackground = data[9];
    bodyPadding = data[10];
    tolerance = undefined !== data[11] ? Number(data[11]) : tolerance;
    inPageLinks.enable = undefined !== data[12] ? strBool(data[12]) : false;
    resizeFrom = undefined !== data[13] ? data[13] : resizeFrom;
    widthCalcMode = undefined !== data[14] ? data[14] : widthCalcMode;
    mouseEvents = undefined !== data[15] ? Boolean(data[15]) : mouseEvents;
  }

  function deprecate(key) {
    var splitName = key.split('Callback');

    if (splitName.length === 2) {
      var name = 'on' + splitName[0].charAt(0).toUpperCase() + splitName[0].slice(1);
      this[name] = this[key];
      delete this[key];
      warn(
        "Deprecated: '" +
          key +
          "' has been renamed '" +
          name +
          "'. The old method will be removed in the next major version."
      );
    }
  }

  function readDataFromPage() {
    function readData() {
      var data = window.iFrameResizer;

      log('Reading data from page: ' + JSON.stringify(data));
      Object.keys(data).forEach(deprecate, data);

      onMessage = 'onMessage' in data ? data.onMessage : onMessage;
      onReady = 'onReady' in data ? data.onReady : onReady;
      targetOriginDefault = 'targetOrigin' in data ? data.targetOrigin : targetOriginDefault;
      heightCalcMode = 'heightCalculationMethod' in data ? data.heightCalculationMethod : heightCalcMode;
      widthCalcMode = 'widthCalculationMethod' in data ? data.widthCalculationMethod : widthCalcMode;
    }

    function setupCustomCalcMethods(calcMode, calcFunc) {
      if ('function' === typeof calcMode) {
        log('Setup custom ' + calcFunc + 'CalcMethod');
        customCalcMethods[calcFunc] = calcMode;
        calcMode = 'custom';
      }

      return calcMode;
    }

    if ('iFrameResizer' in window && Object === window.iFrameResizer.constructor) {
      readData();
      heightCalcMode = setupCustomCalcMethods(heightCalcMode, 'height');
      widthCalcMode = setupCustomCalcMethods(widthCalcMode, 'width');
    }

    log('TargetOrigin for parent set to: ' + targetOriginDefault);
  }

  function chkCSS(attr, value) {
    if (-1 !== value.indexOf('-')) {
      warn('Negative CSS value ignored for ' + attr);
      value = '';
    }
    return value;
  }

  function setBodyStyle(attr, value) {
    if (undefined !== value && '' !== value && 'null' !== value) {
      document.body.style[attr] = value;
      log('Body ' + attr + ' set to "' + value + '"');
    }
  }

  function setMargin() {
    // If called via V1 script, convert bodyMargin from int to str
    if (undefined === bodyMarginStr) {
      bodyMarginStr = bodyMargin + 'px';
    }

    setBodyStyle('margin', chkCSS('margin', bodyMarginStr));
  }

  function stopInfiniteResizingOfIFrame() {
    document.documentElement.style.height = '';
    document.body.style.height = '';
    log('HTML & body height set to "auto"');
  }

  function manageTriggerEvent(options) {
    var listener = {
      add: function (eventName) {
        function handleEvent() {
          sendSize(options.eventName, options.eventType);
        }

        eventHandlersByName[eventName] = handleEvent;

        addEventListener(window, eventName, handleEvent, { passive: true });
      },
      remove: function (eventName) {
        var handleEvent = eventHandlersByName[eventName];
        delete eventHandlersByName[eventName];

        removeEventListener(window, eventName, handleEvent);
      },
    };

    if (options.eventNames && Array.prototype.forEach) {
      options.eventName = options.eventNames[0];
      options.eventNames.forEach(listener[options.method]);
    } else {
      listener[options.method](options.eventName);
    }

    log(capitalizeFirstLetter(options.method) + ' event listener: ' + options.eventType);
  }

  function manageEventListeners(method) {
    manageTriggerEvent({
      method: method,
      eventType: 'Animation Start',
      eventNames: ['animationstart', 'webkitAnimationStart'],
    });
    manageTriggerEvent({
      method: method,
      eventType: 'Animation Iteration',
      eventNames: ['animationiteration', 'webkitAnimationIteration'],
    });
    manageTriggerEvent({
      method: method,
      eventType: 'Animation End',
      eventNames: ['animationend', 'webkitAnimationEnd'],
    });
    manageTriggerEvent({
      method: method,
      eventType: 'Input',
      eventName: 'input',
    });
    manageTriggerEvent({
      method: method,
      eventType: 'Mouse Up',
      eventName: 'mouseup',
    });
    manageTriggerEvent({
      method: method,
      eventType: 'Mouse Down',
      eventName: 'mousedown',
    });
    manageTriggerEvent({
      method: method,
      eventType: 'Orientation Change',
      eventName: 'orientationchange',
    });
    manageTriggerEvent({
      method: method,
      eventType: 'Print',
      eventName: ['afterprint', 'beforeprint'],
    });
    manageTriggerEvent({
      method: method,
      eventType: 'Ready State Change',
      eventName: 'readystatechange',
    });
    manageTriggerEvent({
      method: method,
      eventType: 'Touch Start',
      eventName: 'touchstart',
    });
    manageTriggerEvent({
      method: method,
      eventType: 'Touch End',
      eventName: 'touchend',
    });
    manageTriggerEvent({
      method: method,
      eventType: 'Touch Cancel',
      eventName: 'touchcancel',
    });
    manageTriggerEvent({
      method: method,
      eventType: 'Transition Start',
      eventNames: [
        'transitionstart',
        'webkitTransitionStart',
        'MSTransitionStart',
        'oTransitionStart',
        'otransitionstart',
      ],
    });
    manageTriggerEvent({
      method: method,
      eventType: 'Transition Iteration',
      eventNames: [
        'transitioniteration',
        'webkitTransitionIteration',
        'MSTransitionIteration',
        'oTransitionIteration',
        'otransitioniteration',
      ],
    });
    manageTriggerEvent({
      method: method,
      eventType: 'Transition End',
      eventNames: ['transitionend', 'webkitTransitionEnd', 'MSTransitionEnd', 'oTransitionEnd', 'otransitionend'],
    });
    if ('child' === resizeFrom) {
      manageTriggerEvent({
        method: method,
        eventType: 'IFrame Resized',
        eventName: 'resize',
      });
    }
  }

  function checkCalcMode(calcMode, calcModeDefault, modes, type) {
    if (calcModeDefault !== calcMode) {
      if (!(calcMode in modes)) {
        warn(calcMode + ' is not a valid option for ' + type + 'CalculationMethod.');
        calcMode = calcModeDefault;
      }
      log(type + ' calculation method set to "' + calcMode + '"');
    }

    return calcMode;
  }

  function checkHeightMode() {
    heightCalcMode = checkCalcMode(heightCalcMode, heightCalcModeDefault, getHeight, 'height');
  }

  function checkWidthMode() {
    widthCalcMode = checkCalcMode(widthCalcMode, widthCalcModeDefault, getWidth, 'width');
  }

  function startEventListeners() {
    if (true === autoResize) {
      manageEventListeners('add');
      setupMutationObserver();
    } else {
      log('Auto Resize disabled');
    }
  }

  //   function stopMsgsToParent() {
  //     log('Disable outgoing messages')
  //     sendPermit = false
  //   }

  //   function removeMsgListener() {
  //     log('Remove event listener: Message')
  //     removeEventListener(window, 'message', receiver)
  //   }

  function disconnectMutationObserver() {
    if (null !== bodyObserver) {
      /* istanbul ignore next */ // Not testable in PhantomJS
      bodyObserver.disconnect();
    }
  }

  function stopEventListeners() {
    manageEventListeners('remove');
    disconnectMutationObserver();
    clearInterval(intervalTimer);
  }

  //   function teardown() {
  //     stopMsgsToParent()
  //     removeMsgListener()
  //     if (true === autoResize) stopEventListeners()
  //   }

  function injectClearFixIntoBodyElement() {
    var clearFix = document.createElement('div');
    clearFix.style.clear = 'both';
    // Guard against the following having been globally redefined in CSS.
    clearFix.style.display = 'block';
    clearFix.style.height = '0';
    document.body.appendChild(clearFix);
  }

  function setupInPageLinks() {
    function getPagePosition() {
      return {
        x: window.pageXOffset !== undefined ? window.pageXOffset : document.documentElement.scrollLeft,
        y: window.pageYOffset !== undefined ? window.pageYOffset : document.documentElement.scrollTop,
      };
    }

    function getElementPosition(el) {
      var elPosition = el.getBoundingClientRect(),
        pagePosition = getPagePosition();

      return {
        x: parseInt(elPosition.left, 10) + parseInt(pagePosition.x, 10),
        y: parseInt(elPosition.top, 10) + parseInt(pagePosition.y, 10),
      };
    }

    function findTarget(location) {
      function jumpToTarget(target) {
        var jumpPosition = getElementPosition(target);

        log('Moving to in page link (#' + hash + ') at x: ' + jumpPosition.x + ' y: ' + jumpPosition.y);
        sendMsg(jumpPosition.y, jumpPosition.x, 'scrollToOffset'); // X&Y reversed at sendMsg uses height/width
      }

      var hash = location.split('#')[1] || location, // Remove # if present
        hashData = decodeURIComponent(hash),
        target = document.getElementById(hashData) || document.getElementsByName(hashData)[0];

      if (undefined !== target) {
        jumpToTarget(target);
      } else {
        log('In page link (#' + hash + ') not found in iFrame, so sending to parent');
        sendMsg(0, 0, 'inPageLink', '#' + hash);
      }
    }

    function checkLocationHash() {
      var hash = window.location.hash;
      var href = window.location.href;

      if ('' !== hash && '#' !== hash) {
        findTarget(href);
      }
    }

    function bindAnchors() {
      function setupLink(el) {
        function linkClicked(e) {
          e.preventDefault();

          /* jshint validthis:true */
          findTarget(this.getAttribute('href'));
        }

        if ('#' !== el.getAttribute('href')) {
          addEventListener(el, 'click', linkClicked);
        }
      }

      Array.prototype.forEach.call(document.querySelectorAll('a[href^="#"]'), setupLink);
    }

    function bindLocationHash() {
      addEventListener(window, 'hashchange', checkLocationHash);
    }

    function initCheck() {
      // Check if page loaded with location hash after init resize
      setTimeout(checkLocationHash, eventCancelTimer);
    }

    function enableInPageLinks() {
      /* istanbul ignore else */ // Not testable in phantomJS
      if (Array.prototype.forEach && document.querySelectorAll) {
        log('Setting up location.hash handlers');
        bindAnchors();
        bindLocationHash();
        initCheck();
      } else {
        warn('In page linking not fully supported in this browser! (See README.md for IE8 workaround)');
      }
    }

    if (inPageLinks.enable) {
      enableInPageLinks();
    } else {
      log('In page linking not enabled');
    }

    return {
      findTarget: findTarget,
    };
  }

  function setupMouseEvents() {
    if (mouseEvents !== true) return;

    function sendMouse(e) {
      sendMsg(0, 0, e.type, e.screenY + ':' + e.screenX);
    }

    function addMouseListener(evt, name) {
      log('Add event listener: ' + name);
      addEventListener(window.document, evt, sendMouse);
    }

    addMouseListener('mouseenter', 'Mouse Enter');
    addMouseListener('mouseleave', 'Mouse Leave');
  }

  function setupPublicMethods() {
    log('Enable public methods');

    win.parentIFrame = {
      autoResize: function autoResizeF(resize) {
        if (true === resize && false === autoResize) {
          autoResize = true;
          startEventListeners();
        } else if (false === resize && true === autoResize) {
          autoResize = false;
          stopEventListeners();
        }
        sendMsg(0, 0, 'autoResize', JSON.stringify(autoResize));
        return autoResize;
      },

      close: function closeF() {
        sendMsg(0, 0, 'close');
        // teardown()
      },

      getId: function getIdF() {
        return myID;
      },

      getPageInfo: function getPageInfoF(callback) {
        if ('function' === typeof callback) {
          onPageInfo = callback;
          sendMsg(0, 0, 'pageInfo');
        } else {
          onPageInfo = function () {};
          sendMsg(0, 0, 'pageInfoStop');
        }
      },

      moveToAnchor: function moveToAnchorF(hash) {
        inPageLinks.findTarget(hash);
      },

      reset: function resetF() {
        resetIFrame('parentIFrame.reset');
      },

      scrollTo: function scrollToF(x, y) {
        sendMsg(y, x, 'scrollTo'); // X&Y reversed at sendMsg uses height/width
      },

      scrollToOffset: function scrollToF(x, y) {
        sendMsg(y, x, 'scrollToOffset'); // X&Y reversed at sendMsg uses height/width
      },

      sendMessage: function sendMessageF(msg, targetOrigin) {
        sendMsg(0, 0, 'message', JSON.stringify(msg), targetOrigin);
      },

      setHeightCalculationMethod: function setHeightCalculationMethodF(heightCalculationMethod) {
        heightCalcMode = heightCalculationMethod;
        checkHeightMode();
      },

      setWidthCalculationMethod: function setWidthCalculationMethodF(widthCalculationMethod) {
        widthCalcMode = widthCalculationMethod;
        checkWidthMode();
      },

      setTargetOrigin: function setTargetOriginF(targetOrigin) {
        log('Set targetOrigin: ' + targetOrigin);
        targetOriginDefault = targetOrigin;
      },

      size: function sizeF(customHeight, customWidth) {
        var valString = '' + (customHeight || '') + (customWidth ? ',' + customWidth : '');
        sendSize('size', 'parentIFrame.size(' + valString + ')', customHeight, customWidth);
      },
    };
  }

  function initInterval() {
    if (0 !== interval) {
      log('setInterval: ' + interval + 'ms');
      intervalTimer = setInterval(function () {
        sendSize('interval', 'setInterval: ' + interval);
      }, Math.abs(interval));
    }
  }

  // Not testable in PhantomJS
  /* istanbul ignore next */
  function setupBodyMutationObserver() {
    function addImageLoadListeners(mutation) {
      function addImageLoadListener(element) {
        if (false === element.complete) {
          log('Attach listeners to ' + element.src);
          element.addEventListener('load', imageLoaded, false);
          element.addEventListener('error', imageError, false);
          elements.push(element);
        }
      }

      if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
        addImageLoadListener(mutation.target);
      } else if (mutation.type === 'childList') {
        Array.prototype.forEach.call(mutation.target.querySelectorAll('img'), addImageLoadListener);
      }
    }

    function removeFromArray(element) {
      elements.splice(elements.indexOf(element), 1);
    }

    function removeImageLoadListener(element) {
      log('Remove listeners from ' + element.src);
      element.removeEventListener('load', imageLoaded, false);
      element.removeEventListener('error', imageError, false);
      removeFromArray(element);
    }

    function imageEventTriggered(event, type, typeDesc) {
      removeImageLoadListener(event.target);
      sendSize(type, typeDesc + ': ' + event.target.src);
    }

    function imageLoaded(event) {
      imageEventTriggered(event, 'imageLoad', 'Image loaded');
    }

    function imageError(event) {
      imageEventTriggered(event, 'imageLoadFailed', 'Image load failed');
    }

    function mutationObserved(mutations) {
      sendSize('mutationObserver', 'mutationObserver: ' + mutations[0].target + ' ' + mutations[0].type);

      // Deal with WebKit / Blink async image loading when tags are injected into the page
      mutations.forEach(addImageLoadListeners);
    }

    function createMutationObserver() {
      var target = document.querySelector('body'),
        config = {
          attributes: true,
          attributeOldValue: false,
          characterData: true,
          characterDataOldValue: false,
          childList: true,
          subtree: true,
        };

      observer = new MutationObserver(mutationObserved);

      log('Create body MutationObserver');
      observer.observe(target, config);

      return observer;
    }

    var elements = [],
      MutationObserver = window.MutationObserver || window.WebKitMutationObserver,
      observer = createMutationObserver();

    return {
      disconnect: function () {
        if ('disconnect' in observer) {
          log('Disconnect body MutationObserver');
          observer.disconnect();
          elements.forEach(removeImageLoadListener);
        }
      },
    };
  }

  function setupMutationObserver() {
    var forceIntervalTimer = 0 > interval;

    // Not testable in PhantomJS
    /* istanbul ignore if */ if (window.MutationObserver || window.WebKitMutationObserver) {
      if (forceIntervalTimer) {
        initInterval();
      } else {
        bodyObserver = setupBodyMutationObserver();
      }
    } else {
      log('MutationObserver not supported in this browser!');
      initInterval();
    }
  }

  // document.documentElement.offsetHeight is not reliable, so
  // we have to jump through hoops to get a better value.
  function getComputedStyle(prop, el) {
    var retVal = 0;
    el = el || document.body; // Not testable in phantomJS

    retVal = document.defaultView.getComputedStyle(el, null);
    retVal = null !== retVal ? retVal[prop] : 0;

    return parseInt(retVal, base);
  }

  function chkEventThrottle(timer) {
    if (timer > throttledTimer / 2) {
      throttledTimer = 2 * timer;
      log('Event throttle increased to ' + throttledTimer + 'ms');
    }
  }

  // Idea from https://github.com/guardian/iframe-messenger
  function getMaxElement(side, elements) {
    var elementsLength = elements.length,
      elVal = 0,
      maxVal = 0,
      Side = capitalizeFirstLetter(side),
      timer = getNow();

    for (var i = 0; i < elementsLength; i++) {
      elVal = elements[i].getBoundingClientRect()[side] + getComputedStyle('margin' + Side, elements[i]);
      if (elVal > maxVal) {
        maxVal = elVal;
      }
    }

    timer = getNow() - timer;

    log('Parsed ' + elementsLength + ' HTML elements');
    log('Element position calculated in ' + timer + 'ms');

    chkEventThrottle(timer);

    return maxVal;
  }

  function getAllMeasurements(dimensions) {
    return [
      dimensions.bodyOffset(),
      dimensions.bodyScroll(),
      dimensions.documentElementOffset(),
      dimensions.documentElementScroll(),
    ];
  }

  function getTaggedElements(side, tag) {
    function noTaggedElementsFound() {
      warn('No tagged elements (' + tag + ') found on page');
      return document.querySelectorAll('body *');
    }

    var elements = document.querySelectorAll('[' + tag + ']');

    if (elements.length === 0) noTaggedElementsFound();

    return getMaxElement(side, elements);
  }

  function getAllElements() {
    return document.querySelectorAll('body *');
  }

  var getHeight = {
      bodyOffset: function getBodyOffsetHeight() {
        return document.body.offsetHeight + getComputedStyle('marginTop') + getComputedStyle('marginBottom');
      },

      offset: function () {
        return getHeight.bodyOffset(); // Backwards compatability
      },

      bodyScroll: function getBodyScrollHeight() {
        return document.body.scrollHeight;
      },

      custom: function getCustomWidth() {
        return customCalcMethods.height();
      },

      documentElementOffset: function getDEOffsetHeight() {
        return document.documentElement.offsetHeight;
      },

      documentElementScroll: function getDEScrollHeight() {
        return document.documentElement.scrollHeight;
      },

      max: function getMaxHeight() {
        return Math.max.apply(null, getAllMeasurements(getHeight));
      },

      min: function getMinHeight() {
        return Math.min.apply(null, getAllMeasurements(getHeight));
      },

      grow: function growHeight() {
        return getHeight.max(); // Run max without the forced downsizing
      },

      lowestElement: function getBestHeight() {
        return Math.max(
          getHeight.bodyOffset() || getHeight.documentElementOffset(),
          getMaxElement('bottom', getAllElements())
        );
      },

      taggedElement: function getTaggedElementsHeight() {
        return getTaggedElements('bottom', 'data-iframe-height');
      },
    },
    getWidth = {
      bodyScroll: function getBodyScrollWidth() {
        return document.body.scrollWidth;
      },

      bodyOffset: function getBodyOffsetWidth() {
        return document.body.offsetWidth;
      },

      custom: function getCustomWidth() {
        return customCalcMethods.width();
      },

      documentElementScroll: function getDEScrollWidth() {
        return document.documentElement.scrollWidth;
      },

      documentElementOffset: function getDEOffsetWidth() {
        return document.documentElement.offsetWidth;
      },

      scroll: function getMaxWidth() {
        return Math.max(getWidth.bodyScroll(), getWidth.documentElementScroll());
      },

      max: function getMaxWidth() {
        return Math.max.apply(null, getAllMeasurements(getWidth));
      },

      min: function getMinWidth() {
        return Math.min.apply(null, getAllMeasurements(getWidth));
      },

      rightMostElement: function rightMostElement() {
        return getMaxElement('right', getAllElements());
      },

      taggedElement: function getTaggedElementsWidth() {
        return getTaggedElements('right', 'data-iframe-width');
      },
    };

  function sizeIFrame(triggerEvent, triggerEventDesc, customHeight, customWidth) {
    function resizeIFrame() {
      height = currentHeight;
      width = currentWidth;

      sendMsg(height, width, triggerEvent);
    }

    function isSizeChangeDetected() {
      function checkTolerance(a, b) {
        var retVal = Math.abs(a - b) <= tolerance;
        return !retVal;
      }

      currentHeight = undefined !== customHeight ? customHeight : getHeight[heightCalcMode]();
      currentWidth = undefined !== customWidth ? customWidth : getWidth[widthCalcMode]();

      return checkTolerance(height, currentHeight) || (calculateWidth && checkTolerance(width, currentWidth));
    }

    function isForceResizableEvent() {
      return !(triggerEvent in { init: 1, interval: 1, size: 1 });
    }

    function isForceResizableCalcMode() {
      return heightCalcMode in resetRequiredMethods || (calculateWidth && widthCalcMode in resetRequiredMethods);
    }

    function logIgnored() {
      log('No change in size detected');
    }

    function checkDownSizing() {
      if (isForceResizableEvent() && isForceResizableCalcMode()) {
        resetIFrame(triggerEventDesc);
      } else if (!(triggerEvent in { interval: 1 })) {
        logIgnored();
      }
    }

    var currentHeight, currentWidth;

    if (isSizeChangeDetected() || 'init' === triggerEvent) {
      lockTrigger();
      resizeIFrame();
    } else {
      checkDownSizing();
    }
  }

  var sizeIFrameThrottled = throttle(sizeIFrame);

  function sendSize(triggerEvent, triggerEventDesc, customHeight, customWidth) {
    function recordTrigger() {
      if (!(triggerEvent in { reset: 1, resetPage: 1, init: 1 })) {
        log('Trigger event: ' + triggerEventDesc);
      }
    }

    function isDoubleFiredEvent() {
      return triggerLocked && triggerEvent in doubleEventList;
    }

    if (!isDoubleFiredEvent()) {
      recordTrigger();
      if (triggerEvent === 'init') {
        sizeIFrame(triggerEvent, triggerEventDesc, customHeight, customWidth);
      } else {
        sizeIFrameThrottled(triggerEvent, triggerEventDesc, customHeight, customWidth);
      }
    } else {
      log('Trigger event cancelled: ' + triggerEvent);
    }
  }

  function lockTrigger() {
    if (!triggerLocked) {
      triggerLocked = true;
      log('Trigger event lock on');
    }
    clearTimeout(triggerLockedTimer);
    triggerLockedTimer = setTimeout(function () {
      triggerLocked = false;
      log('Trigger event lock off');
      log('--');
    }, eventCancelTimer);
  }

  function triggerReset(triggerEvent) {
    height = getHeight[heightCalcMode]();
    width = getWidth[widthCalcMode]();

    sendMsg(height, width, triggerEvent);
  }

  function resetIFrame(triggerEventDesc) {
    var hcm = heightCalcMode;
    heightCalcMode = heightCalcModeDefault;

    log('Reset trigger event: ' + triggerEventDesc);
    lockTrigger();
    triggerReset('reset');

    heightCalcMode = hcm;
  }

  function sendMsg(height, width, triggerEvent, msg, targetOrigin) {
    function setTargetOrigin() {
      if (undefined === targetOrigin) {
        targetOrigin = targetOriginDefault;
      } else {
        log('Message targetOrigin: ' + targetOrigin);
      }
    }

    function sendToParent() {
      var size = height + ':' + width,
        message = myID + ':' + size + ':' + triggerEvent + (undefined !== msg ? ':' + msg : '');

      log('Sending message to host page (' + message + ')');
      target.postMessage(msgID + message, targetOrigin);
    }

    if (true === sendPermit) {
      setTargetOrigin();
      sendToParent();
    }
  }

  function receiver(event) {
    var processRequestFromParent = {
      init: function initFromParent() {
        initMsg = event.data;
        target = event.source;

        init();
        firstRun = false;
        setTimeout(function () {
          initLock = false;
        }, eventCancelTimer);
      },

      reset: function resetFromParent() {
        if (!initLock) {
          log('Page size reset by host page');
          triggerReset('resetPage');
        } else {
          log('Page reset ignored by init');
        }
      },

      resize: function resizeFromParent() {
        sendSize('resizeParent', 'Parent window requested size check');
      },

      moveToAnchor: function moveToAnchorF() {
        inPageLinks.findTarget(getData());
      },
      inPageLink: function inPageLinkF() {
        this.moveToAnchor();
      },

      pageInfo: function pageInfoFromParent() {
        var msgBody = getData();
        log('PageInfoFromParent called from parent: ' + msgBody);
        onPageInfo(JSON.parse(msgBody));
        log(' --');
      },

      message: function messageFromParent() {
        var msgBody = getData();

        log('onMessage called from parent: ' + msgBody);

        onMessage(JSON.parse(msgBody));
        log(' --');
      },
    };

    function isMessageForUs() {
      return msgID === ('' + event.data).substr(0, msgIdLen); // ''+ Protects against non-string messages
    }

    function getMessageType() {
      return event.data.split(']')[1].split(':')[0];
    }

    function getData() {
      return event.data.substr(event.data.indexOf(':') + 1);
    }

    function isMiddleTier() {
      return (
        (!(typeof module !== 'undefined' && module.exports) && 'iFrameResize' in window) ||
        ('jQuery' in window && 'iFrameResize' in window.jQuery.prototype)
      );
    }

    function isInitMsg() {
      /*
       * Test if this message is from a child below us. This is an ugly test, however, updating
       * the message format would break backwards compatibility.
       */
      return event.data.split(':')[2] in { true: 1, false: 1 };
    }

    function callFromParent() {
      var messageType = getMessageType();

      if (messageType in processRequestFromParent) {
        processRequestFromParent[messageType]();
      } else if (!isMiddleTier() && !isInitMsg()) {
        warn('Unexpected message (' + event.data + ')');
      }
    }

    function processMessage() {
      if (false === firstRun) {
        callFromParent();
      } else if (isInitMsg()) {
        processRequestFromParent.init();
      } else {
        log('Ignored message of type "' + getMessageType() + '". Received before initialization.');
      }
    }

    if (isMessageForUs()) {
      processMessage();
    }
  }

  /*
   * Normally the parent kicks things off when it detects the iFrame has loaded.
   * If this script is async-loaded, then tell parent page to retry init.
   */
  function chkLateLoaded() {
    if ('loading' !== document.readyState) {
      window.parent.postMessage('[iFrameResizerChild]Ready', '*');
    }
  }

  addEventListener(window, 'message', receiver);
  addEventListener(window, 'readystatechange', chkLateLoaded);
  chkLateLoaded();
})();
