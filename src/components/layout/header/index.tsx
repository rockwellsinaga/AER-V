import React from "react";
import { Layout as AntdLayout, Space, theme } from "antd"; // Menggunakan Layout dari antd sebagai AntdLayout
// import { CurrentUser } from "../current-user"; // HAPUS BARIS INI

const { useToken } = theme;

export const Header = () => {
  const { token } = useToken();

  const headerStyles: React.CSSProperties = {
    backgroundColor: token.colorBgElevated,
    display: "flex",
    justifyContent: "flex-end", // Bisa diubah jika tidak ada item lagi di kanan
    alignItems: "center",
    padding: "0px 24px",
    height: "64px",
    position: "sticky",
    top: 0,
    zIndex: 999,
  };

  return (
    <AntdLayout.Header style={headerStyles}>
      <Space align="center" size="middle">
        {/* <CurrentUser /> */} {/* HAPUS BARIS INI */}
        {/* Anda bisa menambahkan item lain di header di sini jika perlu */}
      </Space>
    </AntdLayout.Header>
  );
};