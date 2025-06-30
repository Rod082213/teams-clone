// pages/_document.js
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* EmojiOneArea CSS */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/emojionearea/3.4.2/emojionearea.min.css"
          integrity="sha512-vEia6TQGr3FqC9fk55fH+XhJlAPOlqoHB7OAtygTy3afVsHlZAPyxOKfPTWXRRrAoEMhJ9nwgkssgpSFTRKrgQ=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
        {/* jQuery */}
        <Script
          src="https://code.jquery.com/jquery-3.6.0.min.js"
          integrity="sha256-/xUj+3OJU5yExlq6GSYGSHk7tPXikynS7ogEvDej/m4="
          crossOrigin="anonymous"
        ></Script>
        {/* EmojiOneArea JS */}
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/emojionearea/3.4.2/emojionearea.min.js"
          integrity="sha512-hkvXFLlESjeYENO4CNi69z3AaSs6Y7qkHwwtLvsESKbveGHFhzNoth643EMN7yTDPU00rG/U02U13QIVGtl4rw=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        ></Script>
      </body>
    </Html>
  );
}