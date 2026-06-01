import Document, { Html, Head, Main, NextScript } from "next/document";

class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
          <link
            href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap"
            rel="stylesheet"
          />
          <link rel="manifest" href="/site.webmanifest" />

          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="application-name" content="2settle" />
          <meta name="apple-mobile-web-app-title" content="2settle" />
          <meta name="theme-color" content="#3b82f6" />
          <meta name="msapplication-navbutton-color" content="#3b82f6" />
          <meta
            name="apple-mobile-web-app-status-bar-style"
            content="black-translucent"
          />
          <meta name="msapplication-starturl" content="/" />
          <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta
            name="apple-mobile-web-app-status-bar-style"
            content="default"
          />
          <meta name="apple-mobile-web-app-title" content="2SettleHQ" />
          <meta name="msapplication-TileColor" content="#3b82f6" />
          <meta name="msapplication-config" content="/browserconfig.xml" />
        </Head>

        <body>
          {/* Prevent TronLink from crashing with "Cannot redefine property: ethereum".
              TronLink tries to redefine window.ethereum but Wagmi marks it non-configurable.
              This ensures the property stays configurable so both can coexist. */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if (!window.ethereum) {
                  Object.defineProperty(window, 'ethereum', {
                    value: undefined,
                    writable: true,
                    configurable: true,
                  });
                } else {
                  try {
                    var desc = Object.getOwnPropertyDescriptor(window, 'ethereum');
                    if (desc && !desc.configurable) {
                      var val = desc.value;
                      delete window.ethereum;
                      Object.defineProperty(window, 'ethereum', {
                        value: val,
                        writable: true,
                        configurable: true,
                      });
                    }
                  } catch(e) {}
                }
              `,
            }}
          />
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
