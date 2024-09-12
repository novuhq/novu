export const theme = {
  variables: {
    colorPrimary: '#efefed',
    colorPrimaryForeground: 'white',
    colorSecondary: '#efefed',
    colorSecondaryForeground: '#1A1523',
    colorCounter: '#E5484D',
    colorCounterForeground: 'white',
    colorBackground: '#f5f5f4',
    colorForeground: '#1A1523',
    colorNeutral: 'black',
    fontSize: 'inherit',
    borderRadius: '0.375rem',
  },
  elements: {
    notificationListNewNotificationsNotice__button: {
      background: '#2b6cb0',
    },
    notificationListContainer: {
      paddingRight: '10px',
    },
    inboxHeader: {
      padding: '8px 16px',
    },
    inboxStatus__dropdownTrigger: {
      gap: '2px',
    },
    moreActionsContainer: {
      marginRight: '-4px',
    },
    inboxStatus__title: {
      fontSize: '14px',
      fontWeight: '500',
    },
    bellContainer: {
      display: 'none',
    },
    preferences__button: {
      display: 'none',
    },
    popoverContent: {
      width: '100%', // Relative width for responsiveness
      maxWidth: '390px', // Maximum width for larger screens
      height: 'calc(100% - 136px)', // Let the height adjust based on content
      maxHeight: '100%', // Maximum height relative to viewport
      borderRadius: '0px', // Rounded corners
      overflow: 'auto', // Allows scrolling for overflow content
      boxShadow:
        'rgba(15, 15, 15, 0.04) 0px 0px 0px 1px, rgba(15, 15, 15, 0.03) 0px 3px 6px, rgba(15, 15, 15, 0.06) 0px 9px 24px',
      backgroundColor: '#fff', // Background color
      marginTop: '-64px', // Spacing from the top
      marginLeft: '-32px', // Spacing from the left
      fontSize: '14px', // Font size
      fontWeight: '500',
    },
    notificationImage: {
      borderRadius: '50%',
      width: '24px',
      height: '24px',
    },
    notificationDot: {
      marginTop: '2px',
      backgroundColor: '#0081F1',
    },
    notificationSubject: {
      color: 'black',
      fontSize: '14px',
      fontWeight: '600',
    },
    notificationBody: {},

    notificationPrimaryAction__button: {
      variant: 'outline',
      paddingLeft: '8px',
      paddingRight: '8px',
      height: '26px',
      borderRadius: '4px',
      border: '0.5px solid #dfdfdf', // Adding the border line
      fontWeight: '500',
      backgroundColor: 'transparent',
      color: 'black',
      fontSize: '14px',
    },
    notificationSecondaryAction__button: {
      variant: 'outline',
      paddingLeft: '8px',
      paddingRight: '8px',
      height: '26px',
      borderRadius: '4px',
      border: '0.5px solid #dfdfdf', // Adding the border line
      fontWeight: '500',
      backgroundColor: 'transparent',
      color: 'black',
      fontSize: '14px',
    },
  },
};
