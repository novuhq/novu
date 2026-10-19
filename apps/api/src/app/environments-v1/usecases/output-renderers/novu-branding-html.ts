/**
 * This is the HTML for the Novu branding image.
 * Should be in par with the actual React component we show in the dashboard preview:
 * @see apps/dashboard/src/components/workflow-editor/steps/email/novu-branding.tsx
 */
export const NOVU_BRANDING_HTML = `
<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;min-width:300px;width:100%;" data-novu-branding>
  <tbody>
    <tr style="width:100%">
      <td align="center" style="padding:16px 0 24px 0;">
        <a href="https://go.novu.co/powered?utm_source=email" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
          <img src="https://prod-novu-app-bucket.s3.us-east-1.amazonaws.com/assets/email-editor/powered-by-novu.png" alt="Powered by Novu" title="This email was sent using Novu - Open-source notification infrastructure" width="125" height="12" style="display:block;max-width:100%;height:auto;cursor:pointer;" />
        </a>
      </td>
    </tr>
  </tbody>
</table>
`;
