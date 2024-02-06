export const areNovuEmailCredentialsSet = () => {
  return (
    typeof process.env.NOVU_EMAIL_INTEGRATION_API_KEY !== 'undefined' &&
    process.env.NOVU_EMAIL_INTEGRATION_API_KEY !== ''
  );
};

export const areNovuSmsCredentialsSet = () => {
  const isAccountSidSet =
    typeof process.env.NOVU_SMS_INTEGRATION_ACCOUNT_SID !== 'undefined' &&
    process.env.NOVU_SMS_INTEGRATION_ACCOUNT_SID !== '';
  const isTokenSet =
    typeof process.env.NOVU_SMS_INTEGRATION_TOKEN !== 'undefined' &&
    process.env.NOVU_SMS_INTEGRATION_TOKEN !== '';
  const isSenderSet =
    typeof process.env.NOVU_SMS_INTEGRATION_SENDER !== 'undefined' &&
    process.env.NOVU_SMS_INTEGRATION_SENDER !== '';

  return isAccountSidSet && isTokenSet && isSenderSet;
};
