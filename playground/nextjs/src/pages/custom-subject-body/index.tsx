import { Inbox } from '@novu/nextjs';
import Title from '@/components/Title';
import { novuConfig } from '@/utils/config';

export default function CustomSubjectBody() {
  return (
    <>
      <Title title="Custom Subject Body" />
      <Inbox
        {...novuConfig}
        renderSubject={(notification) => {
          return (
            <div>
              Subject: {notification.subject} {new Date().toISOString()}
            </div>
          );
        }}
        renderBody={(notification) => {
          return <div>Body: {notification.body}</div>;
        }}
      />
    </>
  );
}
