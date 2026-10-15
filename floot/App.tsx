import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { GlobalContextProviders } from "./components/_globalContextProviders";
import Page_0 from "./pages/sync.tsx";
import PageLayout_0 from "./pages/sync.pageLayout.tsx";
import Page_1 from "./pages/login.tsx";
import PageLayout_1 from "./pages/login.pageLayout.tsx";
import Page_2 from "./pages/_index.tsx";
import PageLayout_2 from "./pages/_index.pageLayout.tsx";
import Page_3 from "./pages/library.tsx";
import PageLayout_3 from "./pages/library.pageLayout.tsx";
import Page_4 from "./pages/insights.tsx";
import PageLayout_4 from "./pages/insights.pageLayout.tsx";
import Page_5 from "./pages/settings.tsx";
import PageLayout_5 from "./pages/settings.pageLayout.tsx";
import Page_6 from "./pages/watchlist.tsx";
import PageLayout_6 from "./pages/watchlist.pageLayout.tsx";
import Page_7 from "./pages/sync.review.tsx";
import PageLayout_7 from "./pages/sync.review.pageLayout.tsx";
import Page_8 from "./pages/reset-password.tsx";
import PageLayout_8 from "./pages/reset-password.pageLayout.tsx";
import Page_9 from "./pages/forgot-password.tsx";
import PageLayout_9 from "./pages/forgot-password.pageLayout.tsx";
import Page_10 from "./pages/titles.$titleId.tsx";
import PageLayout_10 from "./pages/titles.$titleId.pageLayout.tsx";
import Page_11 from "./pages/settings.account.tsx";
import PageLayout_11 from "./pages/settings.account.pageLayout.tsx";
import Page_12 from "./pages/settings.appearance.tsx";
import PageLayout_12 from "./pages/settings.appearance.pageLayout.tsx";
import Page_13 from "./pages/migration-verification.tsx";
import PageLayout_13 from "./pages/migration-verification.pageLayout.tsx";
import Page_14 from "./pages/$.tsx";
import PageLayout_14 from "./pages/$.pageLayout.tsx";

if (!window.requestIdleCallback) {
  window.requestIdleCallback = (cb) => {
    setTimeout(cb, 1);
  };
}

import "./base.css";

const fileNameToRoute = new Map([["./pages/sync.tsx","/sync"],["./pages/login.tsx","/login"],["./pages/_index.tsx","/"],["./pages/library.tsx","/library"],["./pages/insights.tsx","/insights"],["./pages/settings.tsx","/settings"],["./pages/watchlist.tsx","/watchlist"],["./pages/sync.review.tsx","/sync/review"],["./pages/reset-password.tsx","/reset-password"],["./pages/forgot-password.tsx","/forgot-password"],["./pages/titles.$titleId.tsx","/titles/:titleId"],["./pages/settings.account.tsx","/settings/account"],["./pages/settings.appearance.tsx","/settings/appearance"],["./pages/migration-verification.tsx","/migration-verification"],["./pages/$.tsx","/*"]]);
const fileNameToComponent = new Map([
    ["./pages/sync.tsx", Page_0],
["./pages/login.tsx", Page_1],
["./pages/_index.tsx", Page_2],
["./pages/library.tsx", Page_3],
["./pages/insights.tsx", Page_4],
["./pages/settings.tsx", Page_5],
["./pages/watchlist.tsx", Page_6],
["./pages/sync.review.tsx", Page_7],
["./pages/reset-password.tsx", Page_8],
["./pages/forgot-password.tsx", Page_9],
["./pages/titles.$titleId.tsx", Page_10],
["./pages/settings.account.tsx", Page_11],
["./pages/settings.appearance.tsx", Page_12],
["./pages/migration-verification.tsx", Page_13],
["./pages/$.tsx", Page_14],
  ]);

function makePageRoute(filename: string) {
  const Component = fileNameToComponent.get(filename);
  return <Component />;
}

function toElement({
  trie,
  fileNameToRoute,
  makePageRoute,
}: {
  trie: LayoutTrie;
  fileNameToRoute: Map<string, string>;
  makePageRoute: (filename: string) => React.ReactNode;
}) {
  return [
    ...trie.topLevel.map((filename) => (
      <Route
        key={fileNameToRoute.get(filename)}
        path={fileNameToRoute.get(filename)}
        element={makePageRoute(filename)}
      />
    )),
    ...Array.from(trie.trie.entries()).map(([Component, child], index) => (
      <Route
        key={index}
        element={
          <Component>
            <Outlet />
          </Component>
        }
      >
        {toElement({ trie: child, fileNameToRoute, makePageRoute })}
      </Route>
    )),
  ];
}

type LayoutTrieNode = Map<
  React.ComponentType<{ children: React.ReactNode }>,
  LayoutTrie
>;
type LayoutTrie = { topLevel: string[]; trie: LayoutTrieNode };
function buildLayoutTrie(layouts: {
  [fileName: string]: React.ComponentType<{ children: React.ReactNode }>[];
}): LayoutTrie {
  const result: LayoutTrie = { topLevel: [], trie: new Map() };
  Object.entries(layouts).forEach(([fileName, components]) => {
    let cur: LayoutTrie = result;
    for (const component of components) {
      if (!cur.trie.has(component)) {
        cur.trie.set(component, {
          topLevel: [],
          trie: new Map(),
        });
      }
      cur = cur.trie.get(component)!;
    }
    cur.topLevel.push(fileName);
  });
  return result;
}

function NotFound() {
  return (
    <div>
      <h1>Not Found</h1>
      <p>The page you are looking for does not exist.</p>
      <p>Go back to the <a href="/" style={{ color: 'blue' }}>home page</a>.</p>
    </div>
  );
}

import { useLocation, useNavigationType } from "react-router-dom";

export default function ScrollManager() {
  const { pathname, search, hash } = useLocation();
  const navType = useNavigationType(); // "PUSH" | "REPLACE" | "POP"

  useEffect(() => {
    // Back/forward: keep browser-like behavior
    if (navType === "POP") return;

    // Hash links: let the browser scroll to the anchor
    if (hash) return;

    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, search, hash, navType]);

  return null;
}

export function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: false, v7_relativeSplatPath: false }}>
      <ScrollManager />
      <GlobalContextProviders>
        <Routes>
          {toElement({ trie: buildLayoutTrie({
"./pages/sync.tsx": PageLayout_0,
"./pages/login.tsx": PageLayout_1,
"./pages/_index.tsx": PageLayout_2,
"./pages/library.tsx": PageLayout_3,
"./pages/insights.tsx": PageLayout_4,
"./pages/settings.tsx": PageLayout_5,
"./pages/watchlist.tsx": PageLayout_6,
"./pages/sync.review.tsx": PageLayout_7,
"./pages/reset-password.tsx": PageLayout_8,
"./pages/forgot-password.tsx": PageLayout_9,
"./pages/titles.$titleId.tsx": PageLayout_10,
"./pages/settings.account.tsx": PageLayout_11,
"./pages/settings.appearance.tsx": PageLayout_12,
"./pages/migration-verification.tsx": PageLayout_13,
"./pages/$.tsx": PageLayout_14,
}), fileNameToRoute, makePageRoute })} 
          <Route path="*" element={<NotFound />} />
        </Routes>
      </GlobalContextProviders>
    </BrowserRouter>
  );
}
