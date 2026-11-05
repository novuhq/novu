/**
 * Email bodies as the dashboard's editor saves its built-in blocks: every attribute its nodes declare, empty
 * paragraphs without `content`, and image sizes as the block templates set them.
 */
export const dashboardEmailBodies: Record<string, object> = {
	"card with a section inside a section": {
		content: [
			{
				attrs: {
					align: "left",
					backgroundColor: "#FFFFFF",
					borderColor: "#e2e2e2",
					borderRadius: 6,
					borderWidth: 0,
					marginBottom: 10,
					marginLeft: 0,
					marginRight: 0,
					marginTop: 0,
					paddingBottom: 8,
					paddingLeft: 8,
					paddingRight: 8,
					paddingTop: 8,
					showIfKey: null,
				},
				content: [
					{
						attrs: {
							aliasFor: null,
							alignment: "center",
							alt: null,
							aspectRatio: null,
							borderRadius: 0,
							externalLink: null,
							height: "auto",
							isExternalLinkVariable: false,
							isSrcVariable: false,
							lockAspectRatio: false,
							showIfKey: null,
							src: "https://prod-novu-app-bucket.s3.us-east-1.amazonaws.com/assets/email-editor/header-hero-image.webp",
							title: null,
							width: "100%",
						},
						type: "image",
					},
					{
						attrs: {
							height: 8,
							showIfKey: null,
						},
						type: "spacer",
					},
					{
						attrs: {
							level: 3,
							showIfKey: null,
							textAlign: null,
						},
						content: [
							{
								text: "Your free trial ends on ",
								type: "text",
							},
							{
								attrs: {
									aliasFor: null,
									fallback: null,
									id: "payload.dueDate",
									label: null,
									required: false,
								},
								type: "variable",
							},
							{
								text: " ",
								type: "text",
							},
						],
						type: "heading",
					},
					{
						attrs: {
							align: "left",
							backgroundColor: "#FFFFFF",
							borderColor: "#e2e2e2",
							borderRadius: 6,
							borderWidth: 0,
							marginBottom: 10,
							marginLeft: 0,
							marginRight: 0,
							marginTop: 0,
							paddingBottom: 8,
							paddingLeft: 8,
							paddingRight: 8,
							paddingTop: 8,
							showIfKey: null,
						},
						content: [
							{
								attrs: {
									showIfKey: null,
									textAlign: null,
								},
								content: [
									{
										text: "Your free trial for Novu Business Events and 1 more product with Novu US, Inc. will end soon. You have an upcoming payment on ",
										type: "text",
									},
									{
										attrs: {
											aliasFor: null,
											fallback: null,
											id: "payload.dueDate",
											label: null,
											required: false,
										},
										type: "variable",
									},
								],
								type: "paragraph",
							},
							{
								attrs: {
									height: 24,
									showIfKey: null,
								},
								type: "spacer",
							},
							{
								attrs: {
									showIfKey: null,
									textAlign: null,
								},
								content: [
									{
										marks: [
											{
												attrs: {
													color: "",
												},
												type: "textStyle",
											},
										],
										text: "If you add a payment method, the added payment method will be charged $250.00 or more every month, depending on usage.",
										type: "text",
									},
								],
								type: "paragraph",
							},
							{
								attrs: {
									height: 24,
									showIfKey: null,
								},
								type: "spacer",
							},
							{
								attrs: {
									aliasFor: null,
									alignment: "center",
									borderRadius: "smooth",
									buttonColor: "#f8f8f8",
									isTextVariable: false,
									isUrlVariable: false,
									paddingBottom: 6,
									paddingLeft: 24,
									paddingRight: 24,
									paddingTop: 6,
									showIfKey: null,
									text: "Pay now",
									textColor: "#141313",
									url: "",
									variant: "filled",
									width: "100%",
								},
								type: "button",
							},
							{
								attrs: {
									height: 16,
									showIfKey: null,
								},
								type: "spacer",
							},
							{
								attrs: {
									marginBottom: 10,
									marginTop: 10,
								},
								type: "horizontalRule",
							},
						],
						type: "section",
					},
				],
				type: "section",
			},
		],
		type: "doc",
	},
	"card with two columns": {
		content: [
			{
				attrs: {
					gap: 18,
					marginBottom: 10,
					showIfKey: null,
				},
				content: [
					{
						attrs: {
							columnId: null,
							verticalAlign: "top",
							width: "auto",
						},
						content: [
							{
								attrs: {
									aliasFor: null,
									alignment: "center",
									alt: null,
									aspectRatio: null,
									borderRadius: 8,
									externalLink: null,
									height: "208",
									isExternalLinkVariable: false,
									isSrcVariable: false,
									lockAspectRatio: false,
									showIfKey: null,
									src: "https://prod-novu-app-bucket.s3.us-east-1.amazonaws.com/assets/email-editor/header-hero-image.webp",
									title: null,
									width: "282",
								},
								type: "image",
							},
						],
						type: "column",
					},
					{
						attrs: {
							columnId: null,
							verticalAlign: "top",
							width: "auto",
						},
						content: [
							{
								attrs: {
									showIfKey: null,
									textAlign: null,
								},
								content: [
									{
										marks: [
											{
												type: "bold",
											},
										],
										text: "Multi-Environment support",
										type: "text",
									},
								],
								type: "paragraph",
							},
							{
								attrs: {
									height: 8,
									showIfKey: null,
								},
								type: "spacer",
							},
							{
								attrs: {
									showIfKey: null,
									textAlign: null,
								},
								content: [
									{
										text: "Novu's Multi-Environment Support introduces a structured, secure, and efficient way to handle your notification workflows at every stage.",
										type: "text",
									},
								],
								type: "paragraph",
							},
							{
								attrs: {
									height: 32,
									showIfKey: null,
								},
								type: "spacer",
							},
							{
								attrs: {
									aliasFor: null,
									alignment: "right",
									borderRadius: "smooth",
									buttonColor: "#f8f8f8",
									isTextVariable: false,
									isUrlVariable: false,
									paddingBottom: 6,
									paddingLeft: 24,
									paddingRight: 24,
									paddingTop: 6,
									showIfKey: null,
									text: "Learn more",
									textColor: "#141313",
									url: "",
									variant: "filled",
									width: "auto",
								},
								type: "button",
							},
						],
						type: "column",
					},
				],
				type: "columns",
			},
		],
		type: "doc",
	},
	"footer with columns, icons and links": {
		content: [
			{
				attrs: {
					align: "left",
					backgroundColor: "#FFFFFF",
					borderColor: "#e2e2e2",
					borderRadius: 6,
					borderWidth: 0,
					marginBottom: 10,
					marginLeft: 0,
					marginRight: 0,
					marginTop: 0,
					paddingBottom: 8,
					paddingLeft: 8,
					paddingRight: 8,
					paddingTop: 8,
					showIfKey: null,
				},
				content: [
					{
						attrs: {
							marginBottom: 10,
							marginTop: 10,
						},
						type: "horizontalRule",
					},
					{
						attrs: {
							gap: 8,
							marginBottom: 10,
							showIfKey: null,
						},
						content: [
							{
								attrs: {
									columnId: null,
									verticalAlign: "middle",
									width: 50,
								},
								content: [
									{
										attrs: {
											showIfKey: null,
											textAlign: "left",
										},
										content: [
											{
												attrs: {
													aliasFor: null,
													alt: "Company Logo",
													externalLink: "",
													height: 48,
													isExternalLinkVariable: false,
													isSrcVariable: false,
													src: "https://prod-novu-app-bucket.s3.us-east-1.amazonaws.com/assets/email-editor/logo.png",
													title: null,
													width: 48,
												},
												type: "inlineImage",
											},
											{
												marks: [
													{
														attrs: {
															color: "#64748b",
														},
														type: "textStyle",
													},
												],
												text: "  Company",
												type: "text",
											},
										],
										type: "paragraph",
									},
								],
								type: "column",
							},
							{
								attrs: {
									columnId: null,
									verticalAlign: "top",
									width: 50,
								},
								content: [
									{
										attrs: {
											showIfKey: null,
											textAlign: "right",
										},
										content: [
											{
												marks: [
													{
														attrs: {
															aliasFor: null,
															class: "mly-no-underline",
															href: "",
															isUrlVariable: false,
															rel: "noopener noreferrer nofollow",
															target: "_blank",
														},
														type: "link",
													},
													{
														attrs: {
															color: "#64748b",
														},
														type: "textStyle",
													},
												],
												text: "Website",
												type: "text",
											},
											{
												text: "  |  ",
												type: "text",
											},
											{
												marks: [
													{
														attrs: {
															aliasFor: null,
															class: "mly-no-underline",
															href: "",
															isUrlVariable: false,
															rel: "noopener noreferrer nofollow",
															target: "_blank",
														},
														type: "link",
													},
													{
														attrs: {
															color: "#64748b",
														},
														type: "textStyle",
													},
												],
												text: "Privacy",
												type: "text",
											},
											{
												text: "  |  ",
												type: "text",
											},
											{
												marks: [
													{
														attrs: {
															aliasFor: null,
															class: "mly-no-underline",
															href: "",
															isUrlVariable: false,
															rel: "noopener noreferrer nofollow",
															target: "_blank",
														},
														type: "link",
													},
													{
														attrs: {
															color: "#64748b",
														},
														type: "textStyle",
													},
												],
												text: "Unsubscribe",
												type: "text",
											},
										],
										type: "paragraph",
									},
									{
										attrs: {
											height: 8,
											showIfKey: null,
										},
										type: "spacer",
									},
									{
										attrs: {
											showIfKey: null,
											textAlign: "right",
										},
										content: [
											{
												attrs: {
													aliasFor: null,
													alt: "LinkedIn",
													externalLink: "",
													height: 20,
													isExternalLinkVariable: false,
													isSrcVariable: false,
													src: "https://prod-novu-app-bucket.s3.us-east-1.amazonaws.com/assets/email-editor/linkedin.png",
													title: null,
													width: 20,
												},
												type: "inlineImage",
											},
											{
												text: "  ",
												type: "text",
											},
											{
												attrs: {
													aliasFor: null,
													alt: "Twitter",
													externalLink: "",
													height: 20,
													isExternalLinkVariable: false,
													isSrcVariable: false,
													src: "https://prod-novu-app-bucket.s3.us-east-1.amazonaws.com/assets/email-editor/twitter.png",
													title: null,
													width: 20,
												},
												type: "inlineImage",
											},
											{
												text: "  ",
												type: "text",
											},
											{
												attrs: {
													aliasFor: null,
													alt: "YouTube",
													externalLink: "",
													height: 20,
													isExternalLinkVariable: false,
													isSrcVariable: false,
													src: "https://prod-novu-app-bucket.s3.us-east-1.amazonaws.com/assets/email-editor/youtube.png",
													title: null,
													width: 20,
												},
												type: "inlineImage",
											},
										],
										type: "paragraph",
									},
								],
								type: "column",
							},
						],
						type: "columns",
					},
				],
				type: "section",
			},
		],
		type: "doc",
	},
	"two empty columns": {
		content: [
			{
				attrs: {
					gap: 8,
					marginBottom: 10,
					showIfKey: null,
				},
				content: [
					{
						attrs: {
							columnId: "c1",
							verticalAlign: "top",
							width: "auto",
						},
						content: [
							{
								attrs: {
									showIfKey: null,
									textAlign: null,
								},
								type: "paragraph",
							},
						],
						type: "column",
					},
					{
						attrs: {
							columnId: "c2",
							verticalAlign: "top",
							width: "auto",
						},
						content: [
							{
								attrs: {
									showIfKey: null,
									textAlign: null,
								},
								type: "paragraph",
							},
						],
						type: "column",
					},
				],
				type: "columns",
			},
		],
		type: "doc",
	},
};
