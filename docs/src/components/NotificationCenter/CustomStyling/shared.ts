export const customStyleCode = `const primaryColor = "#E6D5C3";
const secondaryColor = "#C9A8A0";
const primaryTextColor = "#737D89";
const secondaryTextColor = "#869F9F";
const unreadBackGroundColor = "#869F9F";

export const styles = {
  bellButton: {
    root: {
      svg: { color: secondaryColor, fill: primaryColor },
    },
    dot: {
      rect: {
        fill: primaryColor,
        strokeWidth: "0.2",
      },
    },
  },
  unseenBadge: {
    root: { background: primaryColor },
  },
  header: {
    root: {
      backgroundColor: primaryColor,
      "&:hover": { backgroundColor: primaryColor },
      cursor: "pointer",
    },
    cog: { opacity: 1 },
    markAsRead: {
      color: primaryTextColor,
      fontSize: "14px",
    },
    title: ({ colorScheme }) => ({
      color: colorScheme === "light" ? primaryTextColor : "blue",
    }),
    backButton: {
      color: primaryTextColor,
    },
  },
  layout: {
    root: {
      background: primaryColor,
      margin: "0 20px"
    },
  },
  loader: {
    root: {
      stroke: primaryTextColor,
    },
  },
  accordion: {
    item: {
      backgroundColor: secondaryColor,
      ":hover": {
        backgroundColor: secondaryColor,
      },
    },
    content: {
      backgroundColor: secondaryColor,
      borderBottomLeftRadius: "7px",
      borderBottomRightRadius: "7px",
    },
    control: {
      ":hover": {
        backgroundColor: secondaryColor,
      },
      color: primaryTextColor,
      title: {
        color: primaryTextColor,
      },
    },
    chevron: {
      color: primaryTextColor,
    },
  },
  notifications: {
    root: {
      ".nc-notifications-list-item": {
        backgroundColor: secondaryColor,
      },
    },
    listItem: {
      layout: {
        borderRadius: "7px",
        color: primaryTextColor,
      },
      timestamp: { color: secondaryTextColor },
      dotsButton: {
        path: {
          fill: primaryTextColor,
        },
      },
      unread: {
        "::before": { background: unreadBackGroundColor },
      },
    },
  },
  actionsMenu: {
    item: { "&:hover": { backgroundColor: secondaryColor } },
    dropdown: { padding: 0, backgroundColor: primaryColor },
    arrow: { backgroundColor: primaryColor, margin: "0" },
  },
};`;
