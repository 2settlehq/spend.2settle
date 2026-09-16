import React from "react";
import Head from "next/head";
import Layout from "@/components/Layout";
import { cryptoRefundParagraphs, type CryptoRefundParagraph } from "@/content/crypto-refund";

type PolicyBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] };

type PolicySection = { heading: string; blocks: PolicyBlock[] };

const firstSectionIndex = cryptoRefundParagraphs.findIndex((item) => item.style === "HEADING_2");
const introduction = cryptoRefundParagraphs.slice(2, firstSectionIndex);

function buildSections(paragraphs: CryptoRefundParagraph[]): PolicySection[] {
  const sections: PolicySection[] = [];
  for (const item of paragraphs) {
    if (item.style === "HEADING_2") {
      sections.push({ heading: item.text, blocks: [] });
      continue;
    }
    const current = sections[sections.length - 1];
    if (!current) continue;
    if (item.list) {
      const last = current.blocks[current.blocks.length - 1];
      if (last?.kind === "list") last.items.push(item.text);
      else current.blocks.push({ kind: "list", items: [item.text] });
    } else {
      current.blocks.push({ kind: "paragraph", text: item.text });
    }
  }
  return sections;
}

const sections = buildSections(cryptoRefundParagraphs.slice(firstSectionIndex));

function preserveLineBreaks(text: string) {
  return text.replace(/\u000b/g, "\n");
}

export default function CryptoRefundPolicy() {
  return (
    <>
      <Head>
        <title>Crypto Transaction, Cancellation & Refund Policy | 2Settle</title>
        <meta name="description" content="2Settle policy for crypto transactions, cancellations, failed settlements and refunds." />
      </Head>
      <Layout>
        <article className="mx-auto max-w-4xl px-5 py-10 text-gray-800 sm:px-8 sm:py-14">
          <header className="mb-9 border-b border-gray-200 pb-7">
            <h1 className="text-3xl font-bold leading-tight text-[#315ba4] sm:text-4xl">
              {cryptoRefundParagraphs[0].text}
            </h1>
            <p className="mt-4 whitespace-pre-line text-sm leading-6 text-gray-500">
              {preserveLineBreaks(cryptoRefundParagraphs[1].text)}
            </p>
          </header>

          <div className="space-y-4 text-sm leading-7 sm:text-base">
            {introduction.map((item, index) => (
              <p key={index} className="whitespace-pre-line">{preserveLineBreaks(item.text)}</p>
            ))}
          </div>

          {sections.map((section) => (
            <section key={section.heading} className="mt-9 scroll-mt-8">
              <h2 className="mb-4 text-xl font-semibold leading-7 text-[#315ba4] sm:text-2xl">
                {section.heading}
              </h2>
              <div className="space-y-3 text-sm leading-7 sm:text-base">
                {section.blocks.map((block, index) =>
                  block.kind === "list" ? (
                    <ul key={`${section.heading}:list:${index}`} className="list-disc space-y-1 pl-6">
                      {block.items.map((item, itemIndex) => <li key={itemIndex}>{preserveLineBreaks(item)}</li>)}
                    </ul>
                  ) : (
                    <p key={`${section.heading}:paragraph:${index}`} className="whitespace-pre-line">
                      {preserveLineBreaks(block.text)}
                    </p>
                  ),
                )}
              </div>
            </section>
          ))}
        </article>
      </Layout>
    </>
  );
}
