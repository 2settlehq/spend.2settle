import Link from "next/link";
import React from "react";
import Settings from "../components/settings/SettingsPage";
import Layout from "../components/Layout";

const Setting = () => {
  return (
    <div>
      <Layout>
        <Settings />
      </Layout>
    </div>
  );
};

export default Setting;
