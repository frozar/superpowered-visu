import React, { useState, useRef, useEffect } from "react";

// Use some global variable to shortcut the slow redraw mecanism of React

// *** BEGIN PANNING SECTION
let G_mouseMoveXOriginPx = 0;
let G_translationGphInc = 0;
let G_firstZeroEffectiveTranslation = true;
// *** END PANNING SECTION

// *** BEGIN DEBUG SECTION
let G_verbose = false;

function dbg() {
  if (G_verbose) {
    console.log(...arguments);
  }
}
// *** END DEBUG SECTION

export default function Channel(props) {
  const [init, setInit] = useState(true);

  const canvasRef = useRef(null);

  const {
    channel,
    name,
    x0FixedPx,
    setX0FixedPx,
    zoom0,
    setZoom0,
    x1FixedPx,
    setX1FixedPx,
    zoom1,
    setZoom1,
    translationGph,
    setTranslationGph,
    moving,
    setMoving,
    // rerender,
    // setRerender,
    ...propsRest
  } = props;

  // console.log("propsRest", propsRest);

  // *** BEGIN HELPER FUNCTION
  function setDimension(canvas) {
    const parentNode = canvas.parentNode;
    const width = parentNode.clientWidth;
    const height = parentNode.clientHeight;
    const style = getComputedStyle(parentNode);

    // Docutation link:
    // https://www.javascripttutorial.net/javascript-dom/javascript-width-height/
    const contentWidth =
      width - parseInt(style.paddingLeft) - parseInt(style.paddingRight);
    const contentHeight =
      height - parseInt(style.paddingTop) - parseInt(style.paddingBottom);

    canvas.width = contentWidth;
    canvas.height = contentHeight;
  }

  function drawBackground(ctx) {
    function rgbToHex(r, g, b) {
      function componentToHex(c) {
        const hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
      }

      return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
    }

    const halfHeight = ctx.canvas.height / 2;
    const brightPt = (-halfHeight * 2) / 3;

    let centerColorValue;
    let borderColorValue;
    const nbStep = 20;

    // Compute the top background cosine gradiant
    centerColorValue = 255;
    borderColorValue = 210;
    const grd0 = ctx.createLinearGradient(0, brightPt, 0, -halfHeight);
    for (let i = 0; i < nbStep; ++i) {
      const weight = Math.cos(((i / (nbStep - 1)) * Math.PI) / 2);
      const interpValue = Math.floor(
        weight * centerColorValue + (1 - weight) * borderColorValue
      );
      const color = rgbToHex(interpValue, interpValue, interpValue);
      grd0.addColorStop(i / (nbStep - 1), color);
    }

    ctx.fillStyle = grd0;

    // Draw top background
    ctx.beginPath();
    const rectHeight0 = ctx.canvas.height - (halfHeight - brightPt);
    ctx.fillRect(0, brightPt, ctx.canvas.width, -rectHeight0);
    ctx.fill();

    // Compute the bottom background cosine gradiant
    centerColorValue = 255;
    borderColorValue = 160;
    const grd1 = ctx.createLinearGradient(0, brightPt, 0, halfHeight);
    for (let i = 0; i < nbStep; ++i) {
      const weight = Math.cos(((i / (nbStep - 1)) * Math.PI) / 2);
      const interpValue = Math.floor(
        weight * centerColorValue + (1 - weight) * borderColorValue
      );
      const color = rgbToHex(interpValue, interpValue, interpValue);
      grd1.addColorStop(i / (nbStep - 1), color);
    }
    ctx.fillStyle = grd1;

    // Draw bottom background
    ctx.beginPath();
    const rectHeight1 = ctx.canvas.height - (brightPt - -halfHeight);
    ctx.fillRect(0, brightPt, ctx.canvas.width, rectHeight1);
    ctx.fill();
  }

  function setupCanvas(canvasRef) {
    const canvas = canvasRef.current;

    setDimension(canvas);
    const ctx = canvas.getContext("2d");
    ctx.translate(0, canvas.height / 2);

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    drawBackground(ctx);

    return ctx;
  }

  function Graph2Px(xPixel, xFixedPx, zoom, translationGraph) {
    return (xPixel - xFixedPx) * zoom + xFixedPx + translationGraph * zoom;
  }

  function Px2Graph(xGraph, xFixedPx, zoom, translationGraph) {
    return (
      (xGraph - xFixedPx - translationGraph * zoom) * (1 / zoom) + -xFixedPx
    );
  }

  function transformOf0Gph(xFixedPx, zoom, translationGraph) {
    return Graph2Px(0, xFixedPx, zoom, translationGraph);
  }

  function translationMaxOf0Gph(xFixedPx, zoom) {
    return (-1 / zoom) * ((0 - xFixedPx) * zoom + xFixedPx);
  }

  function computeZoomParameters(
    x0FixedPx,
    zoom0,
    x1FixedPx,
    zoom1,
    translation
  ) {
    G_verbose = false;
    dbg("x0FixedPx", x0FixedPx);
    dbg("x1FixedPx", x1FixedPx);
    dbg("zoom0", zoom0);
    dbg("zoom1", zoom1);
    dbg("translation", translation);

    const ZOOM_MAX = 200;
    const ZOOM_MIN = 0.5;
    const eps = 1e-6;
    function clamp(val, min, max) {
      return Math.min(Math.max(val, min), max);
    }

    let xFixed = null;
    let zoom = null;
    let scaledTranslation = null;
    if (x0FixedPx === x1FixedPx) {
      dbg("PASS 1");
      const zoomGlobal = clamp(zoom0 * zoom1, ZOOM_MIN, ZOOM_MAX);
      dbg("zoomGlobal", zoomGlobal);
      // If zoomGlobal big enough, apply a zoom
      if (zoomGlobal < 1 - eps || 1 + eps < zoomGlobal) {
        dbg("PASS 1.0");
        if (
          !(zoom0 === ZOOM_MIN && zoomGlobal === ZOOM_MIN) &&
          !(zoom0 === ZOOM_MAX && zoomGlobal === ZOOM_MAX)
        ) {
          dbg("PASS 1.0.0");
          dbg("transform", transformOf0Gph(x0FixedPx, zoomGlobal, translation));
          // Avoid the see on the left part of the track
          if (0 < transformOf0Gph(x0FixedPx, zoomGlobal, translation)) {
            xFixed = 0;
            zoom = zoomGlobal;
            scaledTranslation = 0;
          } else {
            xFixed = x0FixedPx;
            zoom = zoomGlobal;
            scaledTranslation = translation;
          }
        } else {
          dbg("PASS 1.0.1");
          // In this case, zoom0 === ZOOM_MIN or zoom0 === ZOOM_MAX.
          // So the visu seems unchanged: don't update intern parameters
          xFixed = x0FixedPx;
          zoom = zoomGlobal;
          scaledTranslation = translation;
        }
      } else {
        dbg("PASS 1.1");

        // zoomGlobal == 1 ; x0 == x1
        dbg("transformOf0", transformOf0Gph(0, 1, translation));

        // Avoid the see on the left part of the track
        if (0 < transformOf0Gph(0, 1, translation)) {
          dbg("PASS 1.1.0");
          xFixed = 0;
          zoom = 1;
          scaledTranslation = 0;
        } else {
          dbg("PASS 1.1.1");
          xFixed = 0;
          zoom = 1;
          scaledTranslation = translation;
        }
      }
    } else {
      dbg("PASS 2");
      const zoomGlobal = clamp(zoom0 * zoom1, ZOOM_MIN, ZOOM_MAX);
      dbg("zoomGlobal", zoomGlobal);
      // If zoomGlobal big enough, apply a zoom
      if (zoomGlobal < 1 - eps || 1 + eps < zoomGlobal) {
        dbg("PASS 2.0");
        dbg("zoom0", zoom0);
        dbg("zoomGlobal", zoomGlobal);
        if (
          !(zoom0 === ZOOM_MIN && zoomGlobal === ZOOM_MIN) &&
          !(zoom0 === ZOOM_MAX && zoomGlobal === ZOOM_MAX)
        ) {
          dbg("PASS 2.0.0");
          const xFixedGlobal =
            ((1 - zoom0) * zoom1 * x0FixedPx + (1 - zoom1) * x1FixedPx) /
            (1 - zoom0 * zoom1);

          dbg("xFixedGlobal", xFixedGlobal);
          dbg(
            "transformOf0",
            transformOf0Gph(xFixedGlobal, zoomGlobal, translation)
          );
          // Avoid the see on the left part of the track
          if (0 < transformOf0Gph(xFixedGlobal, zoomGlobal, translation)) {
            xFixed = 0;
            zoom = zoomGlobal;
            scaledTranslation = 0;
          } else {
            xFixed = xFixedGlobal;
            zoom = zoomGlobal;
            scaledTranslation = translation;
          }
        } else {
          dbg("PASS 2.0.1");
          // In this case, zoom0 === ZOOM_MIN or zoom0 === ZOOM_MAX.
          // So the visu seems unchanged: don't update intern parameters

          // Avoid the see on the left part of the track
          if (0 < transformOf0Gph(x0FixedPx, zoom0, translation)) {
            xFixed = 0;
            zoom = zoomGlobal;
            scaledTranslation = 0;
          } else {
            xFixed = x0FixedPx;
            zoom = zoom0;
            scaledTranslation = translation;
          }
        }
      } else {
        dbg("PASS 2.1");

        // zoomGlobal near to 1
        const translationInc =
          (1 / zoom0 - 1) * x0FixedPx + (1 - 1 / zoom0) * x1FixedPx;

        // Avoid the see on the left part of the track
        if (0 < transformOf0Gph(0, 1, translation + translationInc)) {
          xFixed = 0;
          zoom = 1;
          scaledTranslation = 0;
        } else {
          xFixed = 0;
          zoom = 1;
          scaledTranslation = translation + translationInc;
        }
      }
    }
    return [xFixed, zoom, scaledTranslation];
  }

  function applyZoom(ctx, xFixed, zoom, scaledTranslation) {
    ctx.translate(xFixed, 0);
    ctx.scale(zoom, 1);
    ctx.translate(-xFixed, 0);
    ctx.translate(scaledTranslation, 0);
  }

  function computeTranslationParameters(x0FixedPx, zoom0, translationGph) {
    const translationMaxGph = translationMaxOf0Gph(x0FixedPx, zoom0);

    let effectiveTranslation;
    if (translationGph < translationMaxGph) {
      effectiveTranslation = translationGph;
    } else {
      effectiveTranslation = translationMaxGph;

      // Compute a new mouseMoveXOriginPx
      const newMouseMoveXOriginPx =
        G_mouseMoveXOriginPx - (translationMaxGph - translationGph) * zoom0;
      if (newMouseMoveXOriginPx !== G_mouseMoveXOriginPx) {
        G_mouseMoveXOriginPx = newMouseMoveXOriginPx;
      }
    }
    return effectiveTranslation;
  }

  function applyPan(ctx, x0FixedPx, zoom0, effectiveTranslation) {
    ctx.translate(x0FixedPx, 0);
    ctx.scale(zoom0, 1);
    ctx.translate(-x0FixedPx, 0);
    ctx.translate(effectiveTranslation, 0);
  }

  const draw = (ctx, channel, xFixedPx, zoom, translationGph) => {
    const nbPt = channel.data.length;
    const pointWidth = ctx.canvas.width / nbPt;

    // Compute the window of point to display on screen
    let firstVisibleIdx = null;
    let lastVisibleIdx = null;
    for (let i = 0; i < nbPt; ++i) {
      const xGphStart = i * pointWidth;
      const xGphEnd = (i + 1) * pointWidth;
      const xGphMid = (xGphStart + xGphEnd) / 2;
      const xImagePx = Graph2Px(xGphMid, xFixedPx, zoom, translationGph);

      if (!firstVisibleIdx) {
        if (0 <= xImagePx && xImagePx <= ctx.canvas.width) {
          firstVisibleIdx = Math.max(0, i - 1);
        }
      } else if (!lastVisibleIdx) {
        if (ctx.canvas.width < xImagePx) {
          lastVisibleIdx = Math.min(i + 1, nbPt);
        }
      }
    }
    if (firstVisibleIdx && !lastVisibleIdx) {
      lastVisibleIdx = nbPt;
    }

    if (firstVisibleIdx && lastVisibleIdx) {
      // Draw line
      ctx.scale(1, ctx.canvas.height / 2);

      ctx.beginPath();
      ctx.moveTo(0, 0);

      for (let i = firstVisibleIdx; i < lastVisibleIdx; ++i) {
        const xStart = i * pointWidth;
        const xEnd = (i + 1) * pointWidth;
        ctx.lineTo((xStart + xEnd) / 2, -channel.data[i]);
      }

      // Apply gradient
      const grd = ctx.createLinearGradient(0, 0, ctx.canvas.width, 0);
      grd.addColorStop(0, "red");
      grd.addColorStop(1, "blue");
      ctx.strokeStyle = grd;
      ctx.lineWidth = 0.005;
      ctx.stroke();
    }
  };

  const handleWheel = (event) => {
    event.preventDefault();
    let effectiveXFixedPx;
    let effectiveZoom;

    const adjustNormalisation = 200;
    effectiveXFixedPx = event.offsetX;

    if (event.deltaY < 0) {
      const adjust = -event.deltaY / adjustNormalisation;
      const multiplyFactor = 1 + adjust;
      effectiveZoom = multiplyFactor;
    } else if (event.deltaY > 0) {
      const adjust = event.deltaY / adjustNormalisation;
      const multiplyFactor = 1 + adjust;
      effectiveZoom = 1 / multiplyFactor;
    }

    return [effectiveXFixedPx, effectiveZoom];
  };
  // *** END HELPER FUNCTION

  // Executed only once
  useEffect(() => {
    const wheelEventListener = (event) => {
      const [xFixedPx, zoom] = handleWheel(event);
      setX1FixedPx(xFixedPx);
      setZoom1(zoom);
    };

    // Treat wheel event with native event, not synthetic event.
    // Documentation link:
    // https://medium.com/@ericclemmons/react-event-preventdefault-78c28c950e46
    const canvas = canvasRef.current;
    canvas.addEventListener("wheel", wheelEventListener);

    return () => {
      canvas.removeEventListener("wheel", wheelEventListener);
    };
  }, []);

  // Executed at initialisation and when channel or zoom1 change
  useEffect(() => {
    if (init || zoom1 !== 1) {
      const ctx = setupCanvas(canvasRef);

      const [xFixed, zoom, scaledTranslation] = computeZoomParameters(
        x0FixedPx,
        zoom0,
        x1FixedPx,
        zoom1,
        translationGph
      );
      // Apply zoom
      applyZoom(ctx, xFixed, zoom, scaledTranslation);

      // Update internal parameter
      setX0FixedPx(xFixed);
      setZoom0(zoom);
      setTranslationGph(scaledTranslation);
      setZoom1(1);

      // Our draw come here
      draw(ctx, channel, xFixed, zoom, scaledTranslation);
      dbg("");
      setInit(false);
      // setRerender(false);
    }
  }, [channel, zoom0, zoom1, translationGph]);

  // useEffect(() => {
  //   const ctx = setupCanvas(canvasRef);

  //   // Our draw come here
  //   draw(ctx, channel, x0FixedPx, zoom0, translationGph);
  //   // dbg("");
  // }, [translationGph]);

  const handleOnMouseDown = (event, canvasRef) => {
    const canvas = canvasRef.current;
    if (event.ctrlKey) {
      canvas.style.cursor = "move";
      setMoving(true);
      G_mouseMoveXOriginPx = event.nativeEvent.offsetX;
    }
  };

  const handleOnMouseMove = (event, canvasRef) => {
    if (moving) {
      console.log("name", name);
      const mouseXPx = event.nativeEvent.offsetX;
      const moveVectPx = mouseXPx - G_mouseMoveXOriginPx;
      // Avoid to redraw if the translation along X axis doesn't update
      if (G_translationGphInc === moveVectPx / zoom0) {
        return;
      }
      G_translationGphInc = moveVectPx / zoom0;

      const effectiveTranslation = computeTranslationParameters(
        x0FixedPx,
        zoom0,
        translationGph + G_translationGphInc
      );

      // Avoid to redraw if the translation is null
      if (
        (effectiveTranslation === 0 && G_firstZeroEffectiveTranslation) ||
        effectiveTranslation !== 0
      ) {
        if (effectiveTranslation === 0) {
          G_firstZeroEffectiveTranslation = false;
        } else {
          G_firstZeroEffectiveTranslation = true;
        }

        const ctx = setupCanvas(canvasRef);

        // Apply pan
        applyPan(ctx, x0FixedPx, zoom0, effectiveTranslation);

        draw(ctx, channel, x0FixedPx, zoom0, effectiveTranslation);

        // setRerender(true);
      }
    }
  };

  const handleOnMouseUp = (event, canvasRef) => {
    const canvas = canvasRef.current;
    if (moving) {
      setTranslationGph(translationGph + G_translationGphInc);
    }
    G_translationGphInc = 0;
    G_mouseMoveXOriginPx = 0;
    canvas.style.cursor = "default";
    setMoving(false);
  };

  return (
    <canvas
      ref={canvasRef}
      style={{ boxShadow: "2px 6px 10px 2px rgba(0,0,0,0.3)" }}
      onMouseDown={(event) => handleOnMouseDown(event, canvasRef)}
      onMouseMove={(event) => handleOnMouseMove(event, canvasRef)}
      onMouseUp={(event) => handleOnMouseUp(event, canvasRef)}
      {...propsRest}
    />
  );
}
