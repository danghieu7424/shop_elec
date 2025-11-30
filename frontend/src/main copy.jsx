import React from "react";
import { Route, Switch, useLocation } from "react-router-dom";
import { LoaderPage } from "./components/base/LoaderForm.jsx";
import { useStore } from "./store";

// ------------ Components ---------------
import Header from "./components/headerPage";
import HomePage from "./components/homePage";
import AuthPage from "./components/loginPage";

function MainContent() {
  const location = useLocation();
  // const hideHeader = location.pathname === "/auth";
  const [state, dispatch] = useStore();

  return (
    <>

        <>
          {state.isLogin && <AuthPage />}
          {/* <Header /> */}
          <div >
          {/* <div className="page-container"> */}
            <Switch>
              <Route exact path="/" component={HomePage} />
              <Route exact path="/auth" component={HomePage} />
           </Switch>
          </div>
        </>
    </>
  );
}

export default MainContent;
