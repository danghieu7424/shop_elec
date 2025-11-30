import React, { useReducer } from "react";
import Context from "./Context.jsx";
import reducer, { initState } from "./reducer.js";
import logger from "./logger.js";

function Provider({ children }) {
  const [state, dispatch] = useReducer(logger(reducer), initState);
  return (
    <Context.Provider value={[state, dispatch]}>{children}</Context.Provider>
  );
}

export default Provider;
