import { render } from "preact";
import "./styles/fonts.ts";
import "./styles/tokens.css";
import "./styles/base.css";
import { App } from "./App.tsx";

const root = document.getElementById("app")!;
// index.html paints a static header + skeleton while the JS loads; render fresh rather than adopt it.
root.replaceChildren();
render(<App />, root);
