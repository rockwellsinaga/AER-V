import type { IResourceItem } from "@refinedev/core";
import { DashboardOutlined } from "@ant-design/icons";

export const resources: IResourceItem[] = [
  {
    name: "dashboard",
    list: "/",
    meta: {
      label: "Dashboard",
      icon: <DashboardOutlined />,
    },
  },
  // Removed Companies and Tasks resources
];