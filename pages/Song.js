import React, { useState } from "react";
import Channel from "./Channel";

export default function Song(props) {
  const [x0FixedPx, setX0FixedPx] = useState(0);
  const [zoom0, setZoom0] = useState(1);
  const [x1FixedPx, setX1FixedPx] = useState(0);
  const [zoom1, setZoom1] = useState(1);
  const [translationGph, setTranslationGph] = useState(0);
  const [panning, setPanning] = useState(false);
  const [panningTranslation, setPanningTranslation] = useState(0);

  return (
    <>
      <Channel
        channel={props.channelLeft}
        width={props.width}
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
        panning={panning}
        setPanning={setPanning}
        panningTranslation={panningTranslation}
        setPanningTranslation={setPanningTranslation}
      />
      <Channel
        channel={props.channelRight}
        width={props.width}
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
        panning={panning}
        setPanning={setPanning}
        panningTranslation={panningTranslation}
        setPanningTranslation={setPanningTranslation}
      />
    </>
  );
}
