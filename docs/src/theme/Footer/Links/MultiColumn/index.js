import React from 'react';
import LinkItem from '@theme/Footer/LinkItem';

function ColumnLinkItem({ item }) {
  return item.html ? (
    <li
      className="footer__item" // Developer provided the HTML, so assume it's safe.
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{
        __html: item.html,
      }}
    />
  ) : (
    <li key={item.href || item.to} className="footer__item">
      <LinkItem item={item} />
    </li>
  );
}

function Column({ column }) {
  return (
    <div className="col footer__col">
      <div className="footer__title">{column.title}</div>
      <ul className="footer__items clean-list">
        {column.items.map((item, i) => (
          <ColumnLinkItem key={i} item={item} />
        ))}
      </ul>
    </div>
  );
}

function SideColumn() {
  return (
    <div className="col footer__col">
      <a
        className="footer__button"
        href="https://github.com/novuhq/novu"
        target="_blank"
        rel="noopener noreferrer"
      >
        Star us on GitHub
      </a>
      <div className="footer__copyright-mobile">© {new Date().getFullYear()} Novu</div>
    </div>
  );
}

export default function FooterLinksMultiColumn({ columns }) {
  return (
    <div className="row footer__links">
      {columns.map((column, i) => (
        <Column key={i} column={column} />
      ))}
      <div className="footer__break"></div>
      <SideColumn />
    </div>
  );
}
