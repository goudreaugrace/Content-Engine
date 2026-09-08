export type POCReviewMessage = {
  articleId: string;
  articleTitle: string;
  ownerName: string;
  sender: string;
  subject: string;
  body: string;
  timestamp: string;
};

// Shared prototype source for blocking review feedback. The Messages inbox,
// unread badge, and article detail all read this same collection so status,
// sender, and notification state stay aligned.
export const POC_REVIEW_MESSAGES: POCReviewMessage[] = [
  {
    articleId: "ka-cog-optimization",
    articleTitle: "Portal content optimization process",
    ownerName: "Alina Corral",
    sender: "Alfonso Ibarra · Team Admin",
    subject: "Changes requested: Portal content optimization process",
    body: "Please clarify how the optimization process should distinguish regional targeting metadata from true Can Read / Cannot Read security controls.",
    timestamp: "Today · 11:05 AM",
  },
  {
    articleId: "ka-0ff5f3a8",
    articleTitle: "Something vague",
    ownerName: "Demo User",
    sender: "Casey Morgan · Team Admin",
    subject: "Changes requested: Something vague",
    body: "Please clarify the article's purpose, add the intended audience, and confirm the correct knowledge base before you submit it for review again.",
    timestamp: "Today · 10:24 AM",
  },
  {
    articleId: "ka-103d3404",
    articleTitle: "How to update your direct deposit account",
    ownerName: "Test",
    sender: "Casey Morgan · Team Admin",
    subject: "Changes requested: Direct deposit account",
    body: "Please add the missing process details and explain what employees should expect after submitting the change.",
    timestamp: "Yesterday · 4:18 PM",
  },
  {
    articleId: "ka-7f53e3ba",
    articleTitle: "Onboarding new guys to the team",
    ownerName: "Test",
    sender: "Casey Morgan · Team Admin",
    subject: "Changes requested: Onboarding article",
    body: "Replace non-inclusive language with a neutral term such as “new employees” or “new team members,” then review the rest of the article for consistent inclusive wording.",
    timestamp: "Yesterday · 2:42 PM",
  },
  {
    articleId: "ka-aa18fedf",
    articleTitle: "How to update your direct deposit account",
    ownerName: "Test",
    sender: "Casey Morgan · Team Admin",
    subject: "Changes requested: Direct deposit instructions",
    body: "Please provide a clear explanation of what needs to change, include the required employee information, and confirm the correct payroll support path.",
    timestamp: "Aug 18 · 1:30 PM",
  },
  {
    articleId: "ka-b88feaf6",
    articleTitle: "Onboarding new guys to the team",
    ownerName: "Test",
    sender: "Casey Morgan · Team Admin",
    subject: "Changes requested: Onboarding structure",
    body: "Add the required Overview and Troubleshooting sections, and replace non-inclusive language with neutral wording before resubmitting.",
    timestamp: "Aug 17 · 3:12 PM",
  },
  {
    articleId: "ka-7a359c98",
    articleTitle: "How to update your direct deposit account",
    ownerName: "Test",
    sender: "Casey Morgan · Team Admin",
    subject: "Changes requested: Direct deposit article structure",
    body: "Add the required Overview and Troubleshooting sections so employees can understand the task and recover when the process does not work as expected.",
    timestamp: "Aug 16 · 9:45 AM",
  },
];

export function getPOCReviewMessage(articleId: string): POCReviewMessage | undefined {
  return POC_REVIEW_MESSAGES.find((message) => message.articleId === articleId);
}
