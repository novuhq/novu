import { Inbox } from '@novu/nextjs';
import Title from '@/components/Title';
import { novuConfig } from '@/utils/config';

export default function CustomSubjectBody() {
  return (
    <>
      <Title title="Custom Subject Body" />
      <Inbox
        {...novuConfig}
        renderAvatar={(notification) => {
          return (
            <img
              src="https://avataaars.io/?avatarStyle=Circle&topType=LongHairStraight&accessoriesType=Blank&hairColor=BrownDark&facialHairType=Blank&clotheType=BlazerShirt&eyeType=Default&eyebrowType=Default&mouthType=Default&skinColor=Light"
              width={40}
              height={40}
            />
          );
        }}
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
        renderDefaultActions={(notification) => {
          return null;
        }}
        renderCustomActions={(notification) => {
          return (
            <div>
              <button className="nt-bg-primary nt-text-white nt-rounded-md nt-px-4 nt-py-2">click me</button>
            </div>
          );
        }}
      />
    </>
  );
}
