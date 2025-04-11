import { useEffect, useRef } from "react";
import "./styles.css";

import WebGL from "./webgl";

export default function App() {
  const $canvas = useRef();

  useEffect(() => {
    const webgl = new WebGL();

    webgl.prepare($canvas.current);
  }, []);

  return (
    <div className="App">
      <canvas ref={$canvas} />
    </div>
  );
}
