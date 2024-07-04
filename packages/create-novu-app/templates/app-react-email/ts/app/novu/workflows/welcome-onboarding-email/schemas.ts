import { z } from "zod";

// Learn more about zod at the official website: https://zod.dev/
export const payloadSchema = z.object({
  teamImage: z
    .string()
    .url()
    .default(
      "https://images.spr.so/cdn-cgi/imagedelivery/j42No7y-dcokJuNgXeA0ig/dca73b36-cf39-4e28-9bc7-8a0d0cd8ac70/standalone-gradient2x_2/w=128,quality=90,fit=scale-down",
    ),
  userImage: z
    .string()
    .url()
    .default(
      "https://react-email-demo-48zvx380u-resend.vercel.app/static/vercel-user.png",
    ),
  arrowImage: z
    .string()
    .url()
    .default(
      "https://react-email-demo-bdj5iju9r-resend.vercel.app/static/vercel-arrow.png",
    ),
});

export const emailControlSchema = z.object({
  subject: z.string().default("A Successful Test on Novu!"),
  showHeader: z.boolean().default(true),
  components: z
    .array(
      z.object({
        type: z.enum(["heading", "text", "button", "code", "users"]),
        text: z.string().default(""),
        align: z.enum(["left", "center", "right"]).default("left"),
      }),
    )
    .default([
      {
        type: "heading",
        text: "Welcome to Novu",
        align: "center",
      },
      {
        type: "text",
        text: "Congratulations on receiving your first notification email from Novu! Join the hundreds of thousands of developers worldwide who use Novu to build notification platforms for their products.",
        align: "left",
      },
      {
        type: "users",
        align: "center",
        text: "",
      },
      {
        type: "text",
        text: "Ready to get started? Click on the button below, and you will see first-hand how easily you can edit this email content.",
        align: "left",
      },
      {
        type: "button",
        text: "Edit Email",
        align: "center",
      },
    ]),
});
