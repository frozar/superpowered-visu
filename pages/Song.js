import React, { useState, useRef, useEffect } from "react";
import Channel from "./Channel";

export default function Song(props) {
  const [x0FixedPx, setX0FixedPx] = useState(0);
  const [zoom0, setZoom0] = useState(1);
  const [x1FixedPx, setX1FixedPx] = useState(0);
  const [zoom1, setZoom1] = useState(1);
  const [translationGph, setTranslationGph] = useState(0);
  const [moving, setMoving] = useState(false);
  // const [rerender, setRerender] = useState(false);

  return (
    <>
      <Channel
        channel={props.channelLeft}
        name="leftTrack"
        x0FixedPx={x0FixedPx}
        setX0FixedPx={setX0FixedPx}
        zoom0={zoom0}
        setZoom0={setZoom0}
        x1FixedPx={x1FixedPx}
        setX1FixedPx={setX1FixedPx}
        zoom1={zoom1}
        setZoom1={setZoom1}
        translationGph={translationGph}
        setTranslationGph={setTranslationGph}
        moving={moving}
        setMoving={setMoving}
        // rerender={rerender}
        // setRerender={setRerender}
      />
      <Channel
        channel={props.channelRight}
        name="rightTrack"
        x0FixedPx={x0FixedPx}
        setX0FixedPx={setX0FixedPx}
        zoom0={zoom0}
        setZoom0={setZoom0}
        x1FixedPx={x1FixedPx}
        setX1FixedPx={setX1FixedPx}
        zoom1={zoom1}
        setZoom1={setZoom1}
        translationGph={translationGph}
        setTranslationGph={setTranslationGph}
        moving={moving}
        setMoving={setMoving}
        // rerender={rerender}
        // setRerender={setRerender}
      />
    </>
  );
}
