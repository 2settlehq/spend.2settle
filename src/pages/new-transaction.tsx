import ManualTransactionForm from "@/components/manualTransactionForm/ManualTransactionForm";
import Navbar from "@/components/shared/NavBar";
import type { GetServerSideProps } from "next";
import { getToken } from "next-auth/jwt";
import React from "react";

const newTrx = () => {
  return (
    <>
      <Navbar />
      <ManualTransactionForm />
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const session = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!session?.email) {
    return {
      redirect: {
        destination: "/login?callbackUrl=%2Fnew-transaction",
        permanent: false,
      },
    };
  }

  const allowedEmails = (process.env.RATE_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (!allowedEmails.includes(session.email.toLowerCase())) {
    return { notFound: true };
  }

  return { props: {} };
};

export default newTrx;
