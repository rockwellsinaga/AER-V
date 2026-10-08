import React from "react";

import { ThemedLayoutV2, ThemedTitleV2 } from "@refinedev/antd";

import { Header } from "./header";

export const Layout = ({ children }: React.PropsWithChildren) => {
  const CustomLogo = () => (
    <img
      src="/favicon.ico"
      alt="AER-V logo"
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
