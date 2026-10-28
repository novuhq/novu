/** Google's container for agentinbox.md. */
const GTM_ID = 'GTM-TQVVFJ4J';

/**
 * The official bootstrap, kept as Google ships it. A plain `<script>` in `<head>` runs while the
 * document parses. `next/script` would hold the same snippet until after Next starts.
 */
const GTM_BOOTSTRAP = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`;

/** As high in `<head>` as the document allows. */
export function GoogleTagManagerScript() {
  return (
    <script
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Google's official bootstrap; the container id is a constant
      dangerouslySetInnerHTML={{ __html: GTM_BOOTSTRAP }}
    />
  );
}

/**
 * The `<noscript>` iframe Google asks for at the start of `<body>`. Next writes an empty hidden
 * marker before the layout's children, so this is the first content in the body.
 */
export function GoogleTagManagerNoScript() {
  return (
    <noscript>
      <iframe
        title="Google Tag Manager"
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
      />
    </noscript>
  );
}
