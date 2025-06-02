import React from "react";

import { ThemedLayoutV2, ThemedTitleV2 } from "@refinedev/antd";
import { Header } from "./header";

// --- MODIFIED: Impor logo dari direktori src/assets ---
// Pastikan path ini benar sesuai lokasi file logo Anda
import aerVLogoSrc from "../../../public/favicon.ico"; // GANTI DENGAN PATH YANG SESUAI

export const Layout = ({ children }: React.PropsWithChildren) => {
  const CustomLogo = () => (
    <img
      src={aerVLogoSrc} // Menggunakan variabel hasil impor
      alt="AER_V Logo"
      style={{
        height: "30px",
        marginRight: "10px",
        objectFit: "contain",
      }}
    />
  );

  return (
    <>
      <ThemedLayoutV2
        Header={Header}
        Title={(titleProps) => {
          return (
            <ThemedTitleV2
              {...titleProps}
              text="AER-V"
              icon={<CustomLogo />}
            />
          );
        }}
      >
        {children}
      </ThemedLayoutV2>
    </>
  );
};