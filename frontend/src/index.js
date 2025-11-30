import React from 'react';
import ReactDOM from "react-dom";
import { StoreProvider } from "./store";

import MainContent from "./main.jsx";

// ------------ CSS ---------------
import "./access/css/base.css";
import "./access/fonts/fonts_css/fonts.css";
// --------------------------------

// Component chính
function App() {
  return (
    <StoreProvider>
      <MainContent />
    </StoreProvider>
  );
}

// Render ứng dụng React vào phần tử có id 'root'
ReactDOM.render(<App />, document.getElementById("root"));
