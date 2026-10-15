/**
 * Copyright 2025 Miguel Ángel Durán
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const $ = document.querySelector.bind(document)
const vscode = acquireVsCodeApi()
const svgns = "http://www.w3.org/2000/svg";

const touchZoom = 0;
const touchPick = 1;
let centerObj = 0;

let scale = 1
let translateX = 0
let translateY = 0

let selectedElement = undefined;
let touchMode = touchZoom;

const renderables = [
  "rect", "circle", "ellipse", "line", "polyline", "polygon", "path", "text",
  "tspan", "g", "symbol", "use", "image", "clippath", "mask"
];

function sendDataToDocument(textData) {
  vscode.postMessage({ type: 'find', text: textData });
}

const PX = (n) => { return n + "px" }

const _atr = (obj, atr, value) => {
  if (value)
    obj.setAttribute(atr, value);
  else
    return obj.getAttribute(atr) ?? '';
}

const _atrs = (obj, atrs) => Object.keys(atrs).forEach((a) => {
  console.log(a, atrs[a]);
  _atr(obj, a, atrs[a])
});

const _atrDel = (obj, atrs) => {
  atrs.forEach(a => obj.removeAttribute(a));
}

const _styles = (obj, stys) => {
  for (const [clave, valor] of Object.entries(stys)) {
    obj.style[clave] = valor;
  }
}

const styDel = (o, prop) => {
  prop.forEach(a => o.style.removeProperty(a));
}

const _rect = (x, y, w, h) => {
  return { x: x, y: y, width: Math.max(w, 1), height: Math.max(h, 1) };
}

const _elNS = (tag, ns = "", ats, parent = null) => {
  let o = document.createElementNS(ns, tag);
  if (ats) {
    _atrs(o, ats);
  }
  if (parent) {
    parent.appendChild(o);
  }
  return o;
}

const byId = (id, parent) => {
  if (!parent) parent = document;
  return parent.getElementById(id);
}



const _fill = (obj) => {
  let fill = _atr(obj, "fill");
  // fill defined in style rules over attribute
  if (obj.style.fill != "") {
    fill = obj.style.fill;
  }
  return fill;
};

const border = (obj) => {
  Array.from(obj.children).forEach((i) => {
    if (i.tagName && renderables.indexOf(i.tagName.toLowerCase()) > -1) {
      i.addEventListener("mouseenter", (e) => {
        const objInfo = byId("objInfo");
        let este = e.srcElement;
        let str = este.tagName;
        if (_atr(este, "id")) str += "<br>#" + _atr(este, "id");
        const fill = _fill(este);
        if (fill != '') {
          str += `<br><div style='background:${fill}' alt='Fill: ${fill}'>&nbsp;</div>`;
        }
        objInfo.innerHTML = str;
      });

      i.addEventListener("click", (e) => {
        if (touchMode === touchZoom) return;
        e.stopPropagation();
        src = e.srcElement;
        selectedElement = src;
        if (byId("deleteSel")) {
          byId("deleteSel").remove();
        }
        const aaa = Replicate(selectedElement);
        src.parentElement.appendChild(aaa);
        adjustStroke(aaa, scale);
        sendDataToDocument(_atr(src, "data-vsc-id"));
      });
      border(i);
    } else {
      i.addEventListener("mouseenter", (e) => {
        byId("objInfo").innerHTML = '';
      });
    }
  });
}


// Best function name ever declared
const cleanClon = (clon) => {
  const del = ["fill", "filter", "stroke", "stroke-width", "stroke-dashoffset", "fill-opacity", "clip-path"];
  styDel(clon, del);
  _atrDel(clon, del);
}


// Producto de las matrices de transform de todos los ancestros de `el` (incluido el propio `el`)
// Producto de las matrices de transform de `el` y todos sus ancestros
function acumulatedMat(el) {
  let m = new DOMMatrix();
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
    const t = getComputedStyle(n).transform;
    if (t && t !== 'none') m = new DOMMatrix(t).multiply(m);
  }
  return m;
}

function zoomObj(el, cntr, { viewport = cntr.parentElement } = {}) {
  const bakTransition = cntr.style.transition;
  const ini = getComputedStyle(cntr).transform;
  cntr.style.transition = 'none';
  const vRect = viewport.getBoundingClientRect();
  let eRect = el.getBoundingClientRect();
  if (!eRect.width || !eRect.height) {
    cntr.style.transition = bakTransition;
    return null;
  }

  let actual = new DOMMatrix(ini);
  const s = Math.min(Math.min(vRect.width / eRect.width, vRect.height / eRect.height) * 0.9, Infinity);
  actual = new DOMMatrix().scale(s).multiply(actual);
  cntr.style.transform = actual.toString();
  eRect = el.getBoundingClientRect();
  const dx = (vRect.left + vRect.width / 2) - (eRect.left + eRect.width / 2);
  const dy = (vRect.top + vRect.height / 2) - (eRect.top + eRect.height / 2);
  const P = acumulatedMat(cntr.parentElement);
  const local = P.inverse().transformPoint(new DOMPoint(dx, dy, 0, 0)); // w=0: vector
  const final = new DOMMatrix().translate(local.x, local.y).multiply(actual);
  cntr.style.transform = ini;
  void cntr.offsetWidth;
  _styles(cntr, { transition: bakTransition || 'transform 0.3s ease', transform: final.toString() });
  // cntr.style.transition = bakTransition || 'transform 0.3s ease';
  // cntr.style.transform = final.toString();
  return final;
}


const adjustStroke = (obj, scale) => {
  if (obj) {
    _styles(obj, { "stroke-width": PX(2 / scale), "stroke-dasharray": PX(4 / scale) });
  }
}

const Replicate = (orig) => {
  let clon;
  if (renderables.includes(orig.tagName)) {
    clon = orig.cloneNode(true);
    cleanClon(clon);
    clon.childNodes.forEach((a) => {
      cleanClon(a);
    });
    _atrs(clon, { class: "sel-ele", id: "deleteSel" });
    _styles(clon, { fill: "transparent" });
    adjustStroke(clon, scale);
    orig.parentElement.appendChild(clon);
  }
  return clon;
}

  ; (function () {
    const preview = $('#preview')
    const svgWrapper = $('#svgWrapper')
    const colorPicker = $('#colorPicker')
    const colorPickerWrapper = $('#colorPickerWrapper')
    const colorSwatch = $('#colorSwatch')
    const toggleDarkBg = $('#toggleDarkBg')
    const toggleDarkBgWrapper = $('#toggleDarkBgWrapper')
    const centerIconWrapper = $('#centerIconWrapper')
    const optimizeWrapper = $('#optimizeWrapper')
    const zoomLevel = $('#zoomLevel')
    const svgSize = $('#svgSize')
    const previewFillRatio = 0.8
    const zoomWrapper = $('#zoomWrapper')
    const objectPicker = $('#objectPicker')
    const objectFit = $('#objectFit')

    // Get default color from the color picker value (set by template)
    let currentColor = colorPicker.value
    let isDarkBackground = false

    // Zoom and pan state
    let isPanning = false
    let wasPanning = false
    let panStartX = 0
    let panStartY = 0
    let isAltPressed = false
    let svgFitFrame = null

    // Initialize color
    colorSwatch.style.backgroundColor = currentColor
    svgWrapper.style.color = currentColor

    // The color picker only has an effect on elements painted with `currentColor`.
    // Disable it when the current SVG doesn't use currentColor anywhere.
    const updateColorPickerAvailability = () => {
      const hasCurrentColor = /currentcolor/i.test(svgWrapper.innerHTML || '')
      colorPickerWrapper.classList.toggle('disabled', !hasCurrentColor)
      colorPickerWrapper.setAttribute('aria-disabled', String(!hasCurrentColor))
      colorPickerWrapper.title = hasCurrentColor
        ? 'Change currentColor value'
        : 'This SVG has no currentColor to change'
    }

    updateColorPickerAvailability()

    const getSvgBounds = (svg) => {
      try {
        const bbox = svg.getBBox()
        if (
          Number.isFinite(bbox.x) &&
          Number.isFinite(bbox.y) &&
          (bbox.width > 0 || bbox.height > 0)
        ) {
          return _rect(bbox.x, bbox.y, bbox.width, bbox.height)
        }
      } catch { }

      const viewBox = svg.viewBox?.baseVal
      if (viewBox && (viewBox.width > 0 || viewBox.height > 0)) {
        return _rect(viewBox.x, viewBox.y, viewBox.width, viewBox.height)
      }

      const width = Number.parseFloat(_atr(svg, 'width') ?? '')
      const height = Number.parseFloat(_atr(svg, 'height') ?? '')
      const rect = svg.getBoundingClientRect()
      const fallbackWidth =
        Number.isFinite(width) && width > 0 ? width : rect.width
      const fallbackHeight =
        Number.isFinite(height) && height > 0 ? height : rect.height

      if (
        (Number.isFinite(fallbackWidth) && fallbackWidth > 0) ||
        (Number.isFinite(fallbackHeight) && fallbackHeight > 0)
      ) {
        return _rect(0, 0, fallbackWidth, fallbackHeight)
      }

      return null
    }

    const fitSvgToPreview = () => {
      const svg = svgWrapper.querySelector('svg')
      if (!svg) {
        return
      }

      border(svg);

      const bounds = getSvgBounds(svg)
      if (!bounds) {
        return
      }

      svg.setAttribute(
        'viewBox',
        `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`
      )
      _atrDel(svg, ['width', 'height'])
      svg.style.overflow = 'visible'

      const maxWidth = preview.clientWidth * previewFillRatio
      const maxHeight = preview.clientHeight * previewFillRatio
      if (maxWidth <= 0 || maxHeight <= 0) {
        return
      }

      const aspectRatio = bounds.width / bounds.height
      let targetWidth = maxWidth
      let targetHeight = targetWidth / aspectRatio

      if (!Number.isFinite(targetHeight) || targetHeight > maxHeight) {
        targetHeight = maxHeight
        targetWidth = targetHeight * aspectRatio
      }

      if (!Number.isFinite(targetWidth) || targetWidth > maxWidth) {
        targetWidth = maxWidth
        targetHeight = targetWidth / aspectRatio
      }

      svg.style.width = PX(Math.max(Math.round(targetWidth), 1))
      svg.style.height = PX(Math.max(Math.round(targetHeight), 1))
    }

    const scheduleSvgFit = () => {
      if (svgFitFrame !== null) {
        return
      }

      svgFitFrame = window.requestAnimationFrame(() => {
        svgFitFrame = null
        fitSvgToPreview()
      })
    }

    scheduleSvgFit()

    // Update preview with currentColor
    const updatePreviewWithColor = (content) => {
      const wrapper = $('#svgWrapper')
      if (wrapper) {
        wrapper.innerHTML = content
        wrapper.style.color = currentColor
        updateColorPickerAvailability()
        scheduleSvgFit()
        updateTransform()
      }
    }

    const updateTransform = () => {
      svgWrapper.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`
      zoomLevel.textContent = `(${Math.round(scale * 100)}%)`
    }

    const resetZoom = () => {
      scale = 1
      translateX = 0
      translateY = 0
      updateTransform()
    }

    const updateSvgFileSize = () => {
      const wrapper = $('#svgWrapper')
      if (wrapper) {
        const byteSize = wrapper.getHTML().length
        const size = (byteSize / 1024).toFixed(1)
        svgSize.textContent = `(${size} KB)`
      }
    }

    colorPickerWrapper.addEventListener('click', () => {
      if (colorPickerWrapper.classList.contains('disabled')) {
        return
      }
      colorPicker.click()
    })

    colorPicker.addEventListener('input', (e) => {
      currentColor = e.target.value
      colorSwatch.style.backgroundColor = currentColor
      svgWrapper.style.color = currentColor
    })

    // Toggle dark background
    toggleDarkBgWrapper.addEventListener('click', () => {
      isDarkBackground = !isDarkBackground

      if (isDarkBackground) {
        preview.classList.add('dark-background')
        toggleDarkBg.innerHTML =
          '<path d="M17 3.34a10 10 0 1 1 -15 8.66l.005 -.324a10 10 0 0 1 14.995 -8.336m-9 1.732a8 8 0 0 0 4.001 14.928l-.001 -16a8 8 0 0 0 -4 1.072" />'
        _atrDel(toggleDarkBg, ['stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'])
        //_atr(toggleDarkBg, 'fill', 'currentColor')
        _atrs(toggleDarkBg, { fill: 'currentColor' })
      } else {
        preview.classList.remove('dark-background')
        toggleDarkBg.innerHTML =
          '<path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M12 17a5 5 0 0 0 0 -10v10" />'
        _atrs(toggleDarkBg, {
          fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5',
          'stroke-linecap': 'round', 'stroke-linejoin': 'round'
        })
      }
    })


    zoomWrapper.addEventListener('click', () => {
      if (touchMode != touchZoom) {
        zoomWrapper.classList.add("selected");
        touchMode = touchZoom;
        objectPicker.classList.remove("selected");
        preview.style.cursor = "zoom-in";
      }
    })

    objectPicker.addEventListener('click', () => {
      if (touchMode == touchZoom) {
        objectPicker.classList.add("selected");
        zoomWrapper.classList.remove("selected");
        touchMode = touchPick;
        preview.style.cursor = "pointer";
      }
    })

    objectFit.addEventListener('click', () => {
      centerObj = (centerObj == 1 ? 0 : 1);
      if (centerObj === 1) {
        objectFit.classList.add("selected");
      } else {
        objectFit.classList.remove("selected");
      }
    })



    // Center icon functionality
    centerIconWrapper.addEventListener('click', () => {
      resetZoom()
    })

    // Optimize functionality
    optimizeWrapper.addEventListener('click', () => {
      vscode.postMessage({
        type: 'optimize'
      })
    })

    // Zoom and pan functionality
    preview.addEventListener('click', (e) => {
      if (wasPanning) return

      if (
        e.target === preview ||
        e.target === svgWrapper ||
        e.target.closest('svg')
      ) {
        // Check both the stored state and the event's altKey
        if (isAltPressed || e.altKey) {
          // Zoom out
          scale = Math.max(0.1, scale - 0.2)
        } else {
          // Zoom in
          scale = Math.min(10, scale + 0.5)
        }
        updateTransform()
      }
    })


    svgWrapper.addEventListener("mousemove", (e) => {
      const layInfo = $("#objInfo");
      const offsetTop = document.querySelector(".preview-header").offsetHeight;
      layInfo.style.left = PX(e.clientX);
      layInfo.style.top = PX(e.clientY - offsetTop);
    });


    preview.addEventListener(
      'wheel',
      (e) => {
        // Check both the stored state and the event's altKey
        if (isAltPressed || e.altKey) {
          e.preventDefault()
          const delta = e.deltaY > 0 ? -0.1 : 0.1
          scale = Math.max(0.1, Math.min(10, scale + delta))
          updateTransform()
        }
      },
      { passive: false }
    )

    preview.addEventListener('mousedown', (e) => {
      // Only start panning if clicking on the SVG with left button and not on color picker
      if (
        e.button === 0 &&
        scale > 1 &&
        !e.target.closest('.preview-header-controls')
      ) {
        isPanning = true
        wasPanning = false
        panStartX = e.clientX - translateX
        panStartY = e.clientY - translateY
        preview.classList.add('grabbing')
        e.preventDefault()
      }
    })

    window.addEventListener('mousemove', (e) => {
      if (isPanning) {
        wasPanning = true
        translateX = e.clientX - panStartX
        translateY = e.clientY - panStartY
        updateTransform()
      }

      // Update cursor based on altKey state
      if (e.altKey && !isAltPressed) {
        isAltPressed = true
        preview.classList.add('zoom-out-cursor')
      } else if (!e.altKey && isAltPressed) {
        isAltPressed = false
        preview.classList.remove('zoom-out-cursor')
      }
    })

    window.addEventListener('mouseup', () => {
      if (isPanning) {
        isPanning = false
        preview.classList.remove('grabbing')
      }
    })

    // Track Alt key state
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Alt' || e.key === 'Option') {
        isAltPressed = true
        preview.classList.add('zoom-out-cursor')
      }
    })

    window.addEventListener('keyup', (e) => {
      if (e.key === 'Alt' || e.key === 'Option') {
        isAltPressed = false
        preview.classList.remove('zoom-out-cursor')
      }
    })

    // Reset Alt state when window loses focus
    window.addEventListener('blur', () => {
      isAltPressed = false
      preview.classList.remove('zoom-out-cursor')
    })

    if ('ResizeObserver' in window) {
      const resizeObserver = new ResizeObserver(() => {
        scheduleSvgFit()
      })
      resizeObserver.observe(preview)
    } else {
      window.addEventListener('resize', () => {
        scheduleSvgFit()
      })
    }

    // Listen for updates from extension
    window.addEventListener('message', (event) => {
      const message = event.data
      if (message.type === 'editing') {
        console.log("hay que seleccionar ", message.content);
        thisSel = document.querySelector(`[data-vsc-id='${message.content}']`);
        if (centerObj == 1) {
          if (selectedElement != thisSel) {
            if (thisSel.tagName && renderables.indexOf(thisSel.tagName.toLowerCase()) > -1) {
              selectedElement = thisSel;
              if (byId("deleteSel")) {
                byId("deleteSel").remove();
              }
              const aaa = Replicate(selectedElement);
              thisSel.parentElement.appendChild(aaa);

              const m = zoomObj(selectedElement, byId("svgWrapper"));
              // revisar            
              if (m) {
                // estado.tx = m.e;
                // estado.ty = m.f; 
                scale = m.a;
              }
            }
          }
        }

      }
      if (message.type === 'update') {
        const svg = svgWrapper.querySelector('svg')
        if (!svg) {
          border(svg);
        }
        updateSvgFileSize()
        updatePreviewWithColor(message.content)
        resetZoom()
      } else if (message.type === 'clear') {
        updateSvgFileSize()
        svgWrapper.innerHTML = ''
        updateColorPickerAvailability()
        resetZoom()
      }
    })
  })()