import { BrowserRouter, Outlet, Route, Routes } from "react-router";

import { RefineThemes, useNotificationProvider } from "@refinedev/antd";
import { Refine } from "@refinedev/core";
// import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools"; // DevtoolsPanel akan dihapus impornya
import { DevtoolsProvider } from "@refinedev/devtools"; // Hanya DevtoolsProvider yang mungkin masih relevan jika Anda ingin menggunakan Devtools di environment tertentu
import routerProvider, {
  DocumentTitleHandler,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";

import { App as AntdApp, ConfigProvider } from "antd";

import { Layout } from "@/components";
import { resources } from "@/config/resources";
import { dataProvider, liveProvider } from "@/providers";
import {
  DashboardPage,
} from "@/routes";

import "@refinedev/antd/dist/reset.css";

const App = () => {
  return (
    <BrowserRouter>
      <ConfigProvider theme={RefineThemes.Blue}>
        <AntdApp>
          {/* DevtoolsProvider bisa tetap ada jika Anda masih ingin mengaktifkan devtools
              secara kondisional atau melalui cara lain, tapi panel floatingnya akan hilang */}
          <DevtoolsProvider>
            <Refine
              routerProvider={routerProvider}
              dataProvider={dataProvider}
              liveProvider={liveProvider}
              notificationProvider={useNotificationProvider}
              // authProvider sudah dihapus sebelumnya
              resources={resources}
              options={{
                syncWithLocation: true,
                warnWhenUnsavedChanges: true,
                liveMode: "auto",
                useNewQueryKeys: true,
              }}
            >
              <Routes>
                <Route
                  element={
                    <Layout>
                      <Outlet />
                    </Layout>
                  }
                >
                  <Route index element={<DashboardPage />} />
                </Route>
              </Routes>
              <UnsavedChangesNotifier />
              <DocumentTitleHandler />
            </Refine>
            {/* <DevtoolsPanel /> */} {/* <-- HAPUS ATAU KOMENTARI BARIS INI */}
          </DevtoolsProvider>
        </AntdApp>
      </ConfigProvider>
    </BrowserRouter>
  );
};

export default App;